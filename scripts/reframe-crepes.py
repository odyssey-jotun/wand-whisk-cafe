#!/usr/bin/env python3
"""Reframe the crepe photos for the arched menu cards: silhouette (crepe + paper cone) centred, side margins
10.5% of the width, and the gap from the silhouette to the arch equal to the side margin (Jesse, 2026-10-24).
Writes enhance/img/crepes/<name>-framed.jpg from the uploads in docs/; scripts/build.mjs swaps them in (FRAMED list).
Needs numpy, scipy, pillow. Run after `node scripts/build.mjs` so docs/ has the uploads, then rebuild."""
import glob, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs"))

NAMES = ["Banana-Pudding-Crepe-Website.jpg","Classic-Japanese-e1784666714454.png","Strawberries-and-Cream-e1784664928864.jpg","Banana-Nutella-e1784666806374.png","Brulee-Crepe-Image-Website.jpg","choc-crepe.jpg","PBD-Crepe.jpg","Strawberry-Wand-e1784665078738.jpg"]
def silhouette(im):
    a = np.asarray(im.convert("RGB")).astype(float)
    h, w, _ = a.shape
    # background model: a smooth plane fitted to the border pixels (the backdrop has a soft left-to-right falloff)
    ys, xs = np.mgrid[0:h, 0:w]
    border = np.zeros((h, w), bool); border[:12] = True; border[:, :12] = True; border[:, -12:] = True
    A = np.c_[xs[border], ys[border], np.ones(border.sum())]
    bg = np.stack([(np.c_[xs.ravel(), ys.ravel(), np.ones(h * w)] @ np.linalg.lstsq(A, a[..., c][border], rcond=None)[0]).reshape(h, w) for c in range(3)], -1)
    diff = np.abs(a - bg).sum(2)
    m = diff > 28
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.nonzero(sizes > 0.002 * h * w)[0])
    return ndimage.binary_fill_holes(keep)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "enhance", "img", "crepes")
os.makedirs(OUT, exist_ok=True)
M = 0.105          # side margin as a fraction of width, same as the taiyaki cards' 10.5%
FEATHER = 14

def plane(a):
    h, w, _ = a.shape
    ys, xs = np.mgrid[0:h, 0:w]
    border = np.zeros((h, w), bool); border[:12] = True; border[:, :12] = True; border[:, -12:] = True
    X = np.c_[xs[border], ys[border], np.ones(border.sum())]
    return [np.linalg.lstsq(X, a[..., c][border], rcond=None)[0] for c in range(3)]

def arch_gap(xs, ys, w):
    r = w / 2; top = ys < r
    if not top.any(): return 9e9
    return (r - np.hypot(xs[top] - r, ys[top] - r)).min()

report = []
for n in NAMES:
    p = glob.glob(f"wp-content/uploads/**/{n}", recursive=True)[0]
    im = Image.open(p).convert("RGB"); a = np.asarray(im).astype(float); h, w, _ = a.shape
    mk = silhouette(im); ys, xs = np.nonzero(mk)
    upper = ys < 0.6 * h
    L, R = xs[upper].min(), xs[upper].max()
    s = w * (1 - 2 * M) / (R - L)
    def place(s):
        tx = (w - s * (R - L)) / 2 - s * L
        lo, hi = -0.5 * h, 0.6 * h      # find ty so the arch gap equals the side margin
        side = (w - s * (R - L)) / 2
        for _ in range(40):
            ty = (lo + hi) / 2
            g = arch_gap(s * xs + tx, s * ys + ty, w)
            lo, hi = (lo, ty) if g > side else (ty, hi)
        return tx, (lo + hi) / 2, side
    tx, ty, side = place(s)
    if s * h + ty < h:                  # never leave a band under the cone: grow until the photo reaches the bottom
        for _ in range(60):
            s *= 1.01; tx, ty, side = place(s)
            if s * h + ty >= h: break
    # render
    Y, X = np.mgrid[0:h, 0:w].astype(float)
    sx, sy = (X - tx) / s, (Y - ty) / s
    coeffs = plane(a)
    bgv = np.stack([coeffs[c][0] * sx + coeffs[c][1] * sy + coeffs[c][2] for c in range(3)], -1)
    src = np.stack([ndimage.map_coordinates(a[..., c], [sy, sx], order=1, mode="nearest") for c in range(3)], -1)
    inside = np.minimum.reduce([sx, sy, (w - 1) - sx, (h - 1) - sy])
    wgt = np.clip(inside / FEATHER, 0, 1)[..., None]
    out = np.clip(src * wgt + bgv * (1 - wgt), 0, 255).astype("uint8")
    base, ext = os.path.splitext(n)
    dst = f"{OUT}/{base}-framed.jpg"
    Image.fromarray(out).save(dst, quality=88, optimize=True, progressive=True)
    report.append((n, round(s, 3), round(ty), round(side / w * 170, 1), round(arch_gap(s * xs + tx, s * ys + ty, w) / w * 170, 1)))
for r in report: print(f"{r[0][:32]:32s} scale {r[1]}  shift {r[2]:4d}px  side {r[3]}px  arch {r[4]}px  (at 170px card)")
