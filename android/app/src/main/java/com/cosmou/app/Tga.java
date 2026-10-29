package com.cosmou.app;

import android.content.ContentResolver;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/** Wii U icons (meta/iconTex.tga, bootTvTex.tga) are uncompressed TGA files: turn them into PNG once. */
final class Tga {
    private Tga() {
    }

    static void toPng(ContentResolver cr, Uri src, File dst) {
        try (InputStream in = cr.openInputStream(src)) {
            byte[] b = Bridge.readAll(in, 8 * 1048576);
            if (b.length < 18) return;
            int w = (b[12] & 255) | (b[13] & 255) << 8, h = (b[14] & 255) | (b[15] & 255) << 8;
            int bpp = b[16] & 255, desc = b[17] & 255;
            if (b[2] != 2 || (bpp != 24 && bpp != 32) || w == 0 || h == 0) return;
            int bytes = bpp / 8, off = 18 + (b[0] & 255);
            if (b.length < off + w * h * bytes) return;
            boolean top = (desc & 0x20) != 0;
            int[] px = new int[w * h];
            for (int y = 0; y < h; y++) {
                int sy = top ? y : h - 1 - y;
                for (int x = 0; x < w; x++) {
                    int s = off + (sy * w + x) * bytes;
                    int a = bytes == 4 ? b[s + 3] & 255 : 255;
                    px[y * w + x] = a << 24 | (b[s + 2] & 255) << 16 | (b[s + 1] & 255) << 8 | (b[s] & 255);
                }
            }
            Bitmap bm = Bitmap.createBitmap(px, w, h, Bitmap.Config.ARGB_8888);
            File tmp = new File(dst.getPath() + ".tmp");
            try (OutputStream o = new FileOutputStream(tmp)) {
                bm.compress(Bitmap.CompressFormat.PNG, 100, o);
            }
            tmp.renameTo(dst);
        } catch (Exception ignored) {
        }
    }

    /** the average color of a picture, like the desktop app: "rgb(r g b)" */
    static String averageColor(File png) {
        try {
            Bitmap bm = BitmapFactory.decodeFile(png.getPath());
            if (bm == null) return "";
            Bitmap s = Bitmap.createScaledBitmap(bm, 8, 8, true);
            long r = 0, g = 0, bl = 0;
            for (int y = 0; y < 8; y++)
                for (int x = 0; x < 8; x++) {
                    int c = s.getPixel(x, y);
                    r += (c >> 16) & 255;
                    g += (c >> 8) & 255;
                    bl += c & 255;
                }
            return "rgb(" + Math.round(r / 64.0) + " " + Math.round(g / 64.0) + " " + Math.round(bl / 64.0) + ")";
        } catch (Exception e) {
            return "";
        }
    }
}
