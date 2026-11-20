package org.albayan.school;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "AlbayanExport",
    permissions = {
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }
        )
    }
)
public class AlbayanExportPlugin extends Plugin {

    private static final String SUBFOLDER = "AlbayanCertificates";
    private static final String AI_VAULT_PREFS = "albayan_ai_secure_vault";
    private final ExecutorService aiHttpExecutor = Executors.newCachedThreadPool();
    private final java.util.concurrent.ConcurrentHashMap<String, HttpURLConnection> activeAiConnections = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Set<String> cancelledAiRequests = java.util.Collections.newSetFromMap(new java.util.concurrent.ConcurrentHashMap<>());

    private enum SaveTarget {
        GALLERY,
        DOWNLOADS
    }

    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        handleMediaSave(call, SaveTarget.GALLERY);
    }

    @PluginMethod
    public void saveFileToDownloads(PluginCall call) {
        handleMediaSave(call, SaveTarget.DOWNLOADS);
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String rawName = call.getString("fileName", "certificate.png");
        String mimeType = call.getString("mimeType", "image/png");
        String title = call.getString("title", "مشاركة الشهادة");
        String text = call.getString("text", "");

        byte[] bytes = decodeBase64(base64Data);
        if (bytes == null || bytes.length == 0) {
            call.reject("Empty or invalid base64 file data");
            return;
        }

        String fileName = sanitizeFileName(rawName, "certificate.png");
        Context ctx = getContext();
        File shareDir = new File(ctx.getCacheDir(), "shared_certs");
        if (!shareDir.exists() && !shareDir.mkdirs()) {
            call.reject("Failed to create cache share directory");
            return;
        }

        // Clean older temp shares to avoid bloating app cache
        File[] oldFiles = shareDir.listFiles();
        if (oldFiles != null) {
            long cutoff = System.currentTimeMillis() - (24L * 60L * 60L * 1000L);
            for (File f : oldFiles) {
                if (f.lastModified() < cutoff) {
                    //noinspection ResultOfMethodCallIgnored
                    f.delete();
                }
            }
        }

        File outFile = new File(shareDir, fileName);
        try (FileOutputStream fos = new FileOutputStream(outFile)) {
            fos.write(bytes);
            fos.flush();
        } catch (IOException e) {
            call.reject("Failed to write temporary share file: " + e.getMessage());
            return;
        }

        if (!outFile.exists() || outFile.length() == 0) {
            call.reject("Share file verification failed (0 bytes)");
            return;
        }

        final Uri contentUri;
        try {
            contentUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", outFile);
        } catch (Exception e) {
            call.reject("FileProvider URI error: " + e.getMessage());
            return;
        }

        final int byteCount = bytes.length;
        getActivity().runOnUiThread(() -> {
            try {
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType(mimeType);
                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                if (text != null && !text.isEmpty()) {
                    shareIntent.putExtra(Intent.EXTRA_TEXT, text);
                }
                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(shareIntent, title);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(chooser);

                JSObject res = new JSObject();
                res.put("verified", true);
                res.put("shared", true);
                res.put("bytes", byteCount);
                res.put("fileName", fileName);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("Unable to launch share sheet: " + e.getMessage());
            }
        });
    }

    private void handleMediaSave(PluginCall call, SaveTarget target) {
        String base64Data = call.getString("base64Data");
        byte[] bytes = decodeBase64(base64Data);
        if (bytes == null || bytes.length == 0) {
            call.reject("Empty or invalid base64 file data");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call,
                    target == SaveTarget.GALLERY ? "onGalleryPermissionResult" : "onDownloadsPermissionResult");
                return;
            }
        }

        performSave(call, target, bytes);
    }

    @PermissionCallback
    private void onGalleryPermissionResult(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            byte[] bytes = decodeBase64(call.getString("base64Data"));
            if (bytes == null || bytes.length == 0) {
                call.reject("Empty or invalid base64 file data");
                return;
            }
            performSave(call, SaveTarget.GALLERY, bytes);
        } else {
            call.reject("Storage permission denied by user");
        }
    }

    @PermissionCallback
    private void onDownloadsPermissionResult(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            byte[] bytes = decodeBase64(call.getString("base64Data"));
            if (bytes == null || bytes.length == 0) {
                call.reject("Empty or invalid base64 file data");
                return;
            }
            performSave(call, SaveTarget.DOWNLOADS, bytes);
        } else {
            call.reject("Storage permission denied by user");
        }
    }

    private void performSave(PluginCall call, SaveTarget target, byte[] bytes) {
        String defaultName = target == SaveTarget.GALLERY ? "certificate.png" : "certificates.zip";
        String defaultMime = target == SaveTarget.GALLERY ? "image/png" : "application/octet-stream";
        String fileName = sanitizeFileName(call.getString("fileName", defaultName), defaultName);
        String mimeType = call.getString("mimeType", defaultMime);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            saveWithMediaStoreQ(call, target, fileName, mimeType, bytes);
        } else {
            saveLegacyExternal(call, target, fileName, mimeType, bytes);
        }
    }

    private void saveWithMediaStoreQ(PluginCall call, SaveTarget target, String fileName, String mimeType, byte[] bytes) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        String baseFolder = target == SaveTarget.GALLERY ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS;
        String relativePath = baseFolder + "/" + SUBFOLDER;

        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri collection = target == SaveTarget.GALLERY
            ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            : MediaStore.Downloads.EXTERNAL_CONTENT_URI;

        Uri itemUri = resolver.insert(collection, values);
        if (itemUri == null) {
            call.reject("MediaStore insert returned null URI");
            return;
        }

        try {
            try (OutputStream os = resolver.openOutputStream(itemUri, "w")) {
                if (os == null) {
                    throw new IOException("openOutputStream returned null");
                }
                os.write(bytes);
                os.flush();
            }

            ContentValues clearPending = new ContentValues();
            clearPending.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(itemUri, clearPending, null, null);

            // Verify the written entry actually exists and has non-zero readable bytes
            long verifiedSize = verifyUriBytes(resolver, itemUri);
            if (verifiedSize <= 0) {
                resolver.delete(itemUri, null, null);
                call.reject("File write verification failed (0 bytes stored)");
                return;
            }

            String actualName = queryDisplayName(resolver, itemUri, fileName);

            JSObject res = new JSObject();
            res.put("verified", true);
            res.put("uri", itemUri.toString());
            res.put("fileName", actualName);
            res.put("path", relativePath + "/" + actualName);
            res.put("bytes", verifiedSize);
            call.resolve(res);
        } catch (Exception e) {
            try {
                resolver.delete(itemUri, null, null);
            } catch (Exception ignored) {}
            call.reject("Failed to save via MediaStore: " + e.getMessage());
        }
    }

    @SuppressWarnings("deprecation")
    private void saveLegacyExternal(PluginCall call, SaveTarget target, String fileName, String mimeType, byte[] bytes) {
        String envDir = target == SaveTarget.GALLERY ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS;
        File rootDir = Environment.getExternalStoragePublicDirectory(envDir);
        File targetDir = new File(rootDir, SUBFOLDER);
        if (!targetDir.exists() && !targetDir.mkdirs()) {
            call.reject("Failed to create folder: " + targetDir.getAbsolutePath());
            return;
        }

        File outFile = makeUniqueFile(targetDir, fileName);
        try (FileOutputStream fos = new FileOutputStream(outFile)) {
            fos.write(bytes);
            fos.flush();
        } catch (IOException e) {
            call.reject("Failed to write file: " + e.getMessage());
            return;
        }

        if (!outFile.exists() || outFile.length() <= 0) {
            call.reject("File verification failed after write");
            return;
        }

        // Notify Android Gallery / Files index immediately
        MediaScannerConnection.scanFile(
            getContext(),
            new String[] { outFile.getAbsolutePath() },
            new String[] { mimeType },
            null
        );

        String displayFolder = (target == SaveTarget.GALLERY ? "Pictures" : "Downloads") + "/" + SUBFOLDER;
        JSObject res = new JSObject();
        res.put("verified", true);
        res.put("uri", Uri.fromFile(outFile).toString());
        res.put("fileName", outFile.getName());
        res.put("path", displayFolder + "/" + outFile.getName());
        res.put("bytes", outFile.length());
        call.resolve(res);
    }

    private static long verifyUriBytes(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, new String[] { OpenableColumns.SIZE }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (idx >= 0 && !cursor.isNull(idx)) {
                    long reported = cursor.getLong(idx);
                    if (reported > 0) {
                        return reported;
                    }
                }
            }
        } catch (Exception ignored) {}

        // Fallback: count bytes by opening input stream directly
        try (InputStream is = resolver.openInputStream(uri)) {
            if (is == null) return 0;
            byte[] buf = new byte[8192];
            long total = 0;
            int read;
            while ((read = is.read(buf)) != -1) {
                total += read;
            }
            return total;
        } catch (Exception e) {
            return 0;
        }
    }

    private static String queryDisplayName(ContentResolver resolver, Uri uri, String fallback) {
        try (Cursor cursor = resolver.query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0 && !cursor.isNull(idx)) {
                    String name = cursor.getString(idx);
                    if (name != null && !name.trim().isEmpty()) {
                        return name;
                    }
                }
            }
        } catch (Exception ignored) {}
        return fallback;
    }

    private static byte[] decodeBase64(String raw) {
        if (raw == null || raw.isEmpty()) return null;
        String clean = raw;
        int commaIdx = clean.indexOf(',');
        if (commaIdx != -1 && clean.substring(0, Math.min(commaIdx, 64)).contains("base64")) {
            clean = clean.substring(commaIdx + 1);
        }
        try {
            return Base64.decode(clean, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String sanitizeFileName(String raw, String fallback) {
        if (raw == null || raw.trim().isEmpty()) return fallback;
        String base = new File(raw.trim()).getName();
        String cleaned = base.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (cleaned.isEmpty() || cleaned.equals(".") || cleaned.equals("..")) {
            return fallback;
        }
        return cleaned;
    }

    /**
     * Synchronize the Android system status bar background color and icon luminance with the active web theme.
     */
    @PluginMethod
    public void setStatusBar(PluginCall call) {
        final String colorHex = call.getString("color", "#FFFFFF");
        final boolean darkIcons = call.getBoolean("darkIcons", true);
        final Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            applyStatusBarToActivity(activity, colorHex, darkIcons);
            call.resolve();
        });
    }

    public static void applyStatusBarToActivity(Activity activity, String colorHex, boolean darkIcons) {
        if (activity == null) return;
        try {
            Window window = activity.getWindow();
            if (window == null) return;
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            String safeHex = (colorHex != null && colorHex.trim().startsWith("#")) ? colorHex.trim() : "#FFFFFF";
            window.setStatusBarColor(Color.parseColor(safeHex));
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(darkIcons);
            }
        } catch (Exception ignored) {
            // Keep UI responsive even if color string is invalid on older devices
        }
    }

    /**
     * Save or clear an AI provider API key inside private native SharedPreferences.
     */
    @PluginMethod
    public void saveAiSecret(PluginCall call) {
        String provider = sanitizeAiProvider(call.getString("provider", ""));
        String rawKey = call.getString("apiKey", "");
        String cleanKey = rawKey != null ? rawKey.trim() : "";

        Context ctx = getContext();
        if (ctx == null || provider.isEmpty()) {
            call.reject("Invalid provider or context");
            return;
        }

        SharedPreferences prefs = ctx.getSharedPreferences(AI_VAULT_PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (cleanKey.isEmpty()) {
            editor.remove("key_" + provider);
        } else {
            editor.putString("key_" + provider, cleanKey);
        }
        editor.apply();

        JSObject res = new JSObject();
        res.put("ok", true);
        res.put("provider", provider);
        res.put("configured", !cleanKey.isEmpty());
        res.put("maskedKey", maskSecretKey(cleanKey));
        call.resolve(res);
    }

    /**
     * Query whether a provider key is stored without exposing the secret itself.
     */
    @PluginMethod
    public void getAiSecretStatus(PluginCall call) {
        String provider = sanitizeAiProvider(call.getString("provider", ""));
        Context ctx = getContext();
        if (ctx == null || provider.isEmpty()) {
            call.reject("Invalid provider or context");
            return;
        }

        SharedPreferences prefs = ctx.getSharedPreferences(AI_VAULT_PREFS, Context.MODE_PRIVATE);
        String stored = prefs.getString("key_" + provider, "");
        String cleanKey = stored != null ? stored.trim() : "";

        JSObject res = new JSObject();
        res.put("ok", true);
        res.put("provider", provider);
        res.put("configured", !cleanKey.isEmpty());
        res.put("maskedKey", maskSecretKey(cleanKey));
        call.resolve(res);
    }

    /**
     * Cancel an active native AI HTTP request by requestId.
     */
    @PluginMethod
    public void cancelAiHttp(PluginCall call) {
        String requestId = call.getString("requestId", "");
        if (requestId != null && !requestId.trim().isEmpty()) {
            String rid = requestId.trim();
            cancelledAiRequests.add(rid);
            HttpURLConnection conn = activeAiConnections.remove(rid);
            if (conn != null) {
                aiHttpExecutor.execute(() -> {
                    try {
                        conn.disconnect();
                    } catch (Exception ignored) {}
                });
            }
        }
        JSObject res = new JSObject();
        res.put("ok", true);
        call.resolve(res);
    }

    /**
     * Perform HTTPS AI provider requests from native layer with vault-injected credentials.
     */
    @PluginMethod
    public void proxyAiHttp(PluginCall call) {
        final String provider = sanitizeAiProvider(call.getString("provider", ""));
        final String targetUrl = call.getString("url", "");
        final String method = call.getString("method", "POST").toUpperCase();
        final String body = call.getString("body", "");
        final JSObject extraHeaders = call.getObject("headers", new JSObject());
        final Integer timeoutObj = call.getInt("timeoutMs", 45000);
        final int timeoutMs = timeoutObj != null ? Math.max(4000, Math.min(timeoutObj, 120000)) : 45000;
        final String overrideKey = call.getString("overrideApiKey", "");
        final String requestId = call.getString("requestId", "req_" + System.currentTimeMillis());

        if (targetUrl == null || (!targetUrl.startsWith("https://") && !targetUrl.startsWith("http://"))) {
            call.reject("Invalid target URL for AI proxy");
            return;
        }

        Context ctx = getContext();
        String resolvedKey = (overrideKey != null && !overrideKey.trim().isEmpty())
            ? overrideKey.trim()
            : "";
        if (resolvedKey.isEmpty() && ctx != null && !provider.isEmpty()) {
            SharedPreferences prefs = ctx.getSharedPreferences(AI_VAULT_PREFS, Context.MODE_PRIVATE);
            resolvedKey = prefs.getString("key_" + provider, "");
            if (resolvedKey != null) resolvedKey = resolvedKey.trim();
        }
        final String apiKeyToUse = resolvedKey != null ? resolvedKey : "";

        aiHttpExecutor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                if (cancelledAiRequests.contains(requestId)) {
                    JSObject abortRes = new JSObject();
                    abortRes.put("ok", false);
                    abortRes.put("status", 0);
                    abortRes.put("aborted", true);
                    abortRes.put("error", "ABORTED");
                    call.resolve(abortRes);
                    return;
                }
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                activeAiConnections.put(requestId, conn);
                conn.setRequestMethod(method);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(timeoutMs);
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                conn.setRequestProperty("Accept", "application/json");

                if (extraHeaders != null) {
                    Iterator<String> keys = extraHeaders.keys();
                    while (keys.hasNext()) {
                        String hk = keys.next();
                        if (hk == null) continue;
                        String lower = hk.toLowerCase();
                        if (lower.equals("authorization") || lower.equals("x-api-key") || lower.equals("x-goog-api-key")) {
                            continue;
                        }
                        String hv = extraHeaders.getString(hk);
                        if (hv != null) {
                            conn.setRequestProperty(hk, hv);
                        }
                    }
                }

                if (!apiKeyToUse.isEmpty()) {
                    if ("gemini".equals(provider)) {
                        conn.setRequestProperty("x-goog-api-key", apiKeyToUse);
                    } else if ("anthropic".equals(provider)) {
                        conn.setRequestProperty("x-api-key", apiKeyToUse);
                        conn.setRequestProperty("anthropic-version", "2023-06-01");
                    } else {
                        conn.setRequestProperty("Authorization", "Bearer " + apiKeyToUse);
                    }
                }

                if (!"GET".equals(method) && !"DELETE".equals(method)) {
                    conn.setDoOutput(true);
                    byte[] payloadBytes = (body != null ? body : "").getBytes(StandardCharsets.UTF_8);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payloadBytes);
                        os.flush();
                    }
                }

                int status = conn.getResponseCode();
                InputStream stream = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
                StringBuilder sb = new StringBuilder();
                if (stream != null) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = br.readLine()) != null) {
                            if (cancelledAiRequests.contains(requestId)) {
                                throw new IOException("ABORTED");
                            }
                            sb.append(line).append('\n');
                        }
                    }
                }

                JSObject res = new JSObject();
                res.put("ok", status >= 200 && status < 300);
                res.put("status", status);
                res.put("data", sb.toString().trim());
                call.resolve(res);
            } catch (Exception e) {
                boolean wasCancelled = cancelledAiRequests.contains(requestId) || "ABORTED".equals(e.getMessage());
                JSObject errRes = new JSObject();
                errRes.put("ok", false);
                errRes.put("status", 0);
                errRes.put("aborted", wasCancelled);
                errRes.put("error", wasCancelled ? "ABORTED" : (e.getClass().getSimpleName() + ": " + (e.getMessage() != null ? e.getMessage() : "Connection failed")));
                call.resolve(errRes);
            } finally {
                activeAiConnections.remove(requestId);
                cancelledAiRequests.remove(requestId);
                if (conn != null) {
                    try {
                        conn.disconnect();
                    } catch (Exception ignored) {}
                }
            }
        });
    }

    private static String sanitizeAiProvider(String raw) {
        if (raw == null) return "";
        String p = raw.trim().toLowerCase();
        if ("gemini".equals(p) || "openai".equals(p) || "anthropic".equals(p) || "custom".equals(p)) {
            return p;
        }
        return "";
    }

    private static String maskSecretKey(String key) {
        if (key == null || key.isEmpty()) return "";
        if (key.length() <= 6) return "••••••";
        return "••••••••" + key.substring(key.length() - 4);
    }

    private static File makeUniqueFile(File dir, String fileName) {
        File candidate = new File(dir, fileName);
        if (!candidate.exists()) return candidate;
        int dot = fileName.lastIndexOf('.');
        String stem = dot > 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot > 0 ? fileName.substring(dot) : "";
        for (int i = 1; i <= 500; i++) {
            File next = new File(dir, stem + "_" + i + ext);
            if (!next.exists()) return next;
        }
        return new File(dir, stem + "_" + System.currentTimeMillis() + ext);
    }
}
