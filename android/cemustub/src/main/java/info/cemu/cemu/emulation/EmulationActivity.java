package info.cemu.cemu.emulation;

import android.app.Activity;
import android.content.ClipData;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.util.Log;
import android.widget.TextView;

import java.io.InputStream;

/** Shows and logs what CosmoU sent ("CemuStub" in logcat), and whether it can read the game and its folder. */
public class EmulationActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        StringBuilder s = new StringBuilder("Cemu test stand-in\n");
        Uri data = getIntent().getData();
        String extra = getIntent().getStringExtra("info.cemu.cemu.LaunchPath");
        s.append("data=").append(data).append('\n').append("extra=").append(extra).append('\n');
        s.append("game readable=").append(readable(data)).append('\n');
        ClipData clip = getIntent().getClipData();
        if (clip != null && clip.getItemCount() > 1) {
            Uri folder = clip.getItemAt(1).getUri();
            s.append("folder=").append(folder).append('\n');
            s.append("folder listable=").append(listable(folder)).append('\n');
        }
        for (String line : s.toString().split("\n")) Log.i("CemuStub", line);
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(18);
        t.setPadding(40, 40, 40, 40);
        setContentView(t);
    }

    boolean readable(Uri u) {
        if (u == null) return false;
        try (InputStream in = getContentResolver().openInputStream(u)) {
            return in != null && in.read() >= -1;
        } catch (Exception e) {
            Log.i("CemuStub", "read failed: " + e);
            return false;
        }
    }

    int listable(Uri folder) {
        try {
            Uri kids = DocumentsContract.buildChildDocumentsUriUsingTree(folder, DocumentsContract.getDocumentId(folder));
            try (Cursor c = getContentResolver().query(kids, null, null, null, null)) {
                return c == null ? -1 : c.getCount();
            }
        } catch (Exception e) {
            Log.i("CemuStub", "list failed: " + e);
            return -1;
        }
    }
}
