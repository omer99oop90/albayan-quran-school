package org.albayan.student;

import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressedTime = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    final WebView webView = getBridge().getWebView();
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  try {" +
                        "    if (typeof window.albayanHandleBack === 'function') {" +
                        "      return window.albayanHandleBack() ? 'HANDLED' : 'ROOT';" +
                        "    }" +
                        "    var p = (window.location.pathname || '').toLowerCase();" +
                        "    if (!p.endsWith('mymark.html') && !p.endsWith('login.html') && !p.endsWith('/') && p.length > 1) {" +
                        "      if (window.history.length > 1) { window.history.back(); return 'HANDLED'; }" +
                        "      window.location.href = 'mymark.html'; return 'HANDLED';" +
                        "    }" +
                        "  } catch(e) {}" +
                        "  return 'ROOT';" +
                        "})()",
                        new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                if (value != null && value.contains("HANDLED")) {
                                    return;
                                }

                                String currentUrl = webView.getUrl();
                                boolean isRootUrl = (currentUrl == null) ||
                                    currentUrl.endsWith("mymark.html") ||
                                    currentUrl.endsWith("login.html") ||
                                    currentUrl.endsWith("/public/index.html") ||
                                    currentUrl.endsWith("/index.html") ||
                                    currentUrl.endsWith("/");

                                if (!isRootUrl && webView.canGoBack()) {
                                    webView.goBack();
                                    return;
                                }

                                long currentTime = System.currentTimeMillis();
                                if (currentTime - lastBackPressedTime < 2000) {
                                    setEnabled(false);
                                    getOnBackPressedDispatcher().onBackPressed();
                                } else {
                                    lastBackPressedTime = currentTime;
                                    Toast.makeText(MainActivity.this, "اضغط مرة أخرى للخروج من التطبيق", Toast.LENGTH_SHORT).show();
                                }
                            }
                        }
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}
