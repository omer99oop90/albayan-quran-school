package org.albayan.school;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

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
