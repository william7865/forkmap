package com.forkmap.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends BridgeActivity {

  private static final Pattern URL_RE = Pattern.compile("https?://\\S+");

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    handleSendIntent(getIntent());
  }

  // singleTask: a share into a running app arrives here instead of a new instance.
  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handleSendIntent(intent);
  }

  // A "Share -> Forkmap" (ACTION_SEND text/plain) carries the post URL in
  // EXTRA_TEXT. Hand it to the web layer as /?import=<url>, which opens the
  // import sheet (see ImportParamWatcher in app/page.tsx).
  private void handleSendIntent(Intent intent) {
    if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return;
    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
    if (text == null) return;
    Matcher m = URL_RE.matcher(text);
    if (!m.find()) return;
    final String url = m.group().replace("\\", "\\\\").replace("'", "\\'");

    final WebView webView = this.bridge.getWebView();
    if (webView == null) return;
    // Small delay so the web app is loaded on a cold start. Tunable on device.
    webView.postDelayed(new Runnable() {
      @Override
      public void run() {
        webView.evaluateJavascript(
          "window.location.href='/?import='+encodeURIComponent('" + url + "')",
          null
        );
      }
    }, 700);
  }
}
