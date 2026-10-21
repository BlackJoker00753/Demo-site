// Карта стран для наведения на глобусе: PNG декодируется и читается в фоновом потоке. На главном потоке
// то же самое занимало ~0,4 с на слабом ноутбуке, и глобус замирал сразу после появления.
// На вход { url }, на выход { w, h, ids } (Uint16Array, номер страны = R + G*256, 0 = океан).

self.onmessage = async ({ data: { url } }) => {
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
    const w = bmp.width, h = bmp.height;
    const ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const px = ctx.getImageData(0, 0, w, h).data;
    const ids = new Uint16Array(w * h);
    for (let i = 0, j = 0; i < ids.length; i++, j += 4) ids[i] = px[j] + px[j + 1] * 256;
    self.postMessage({ w, h, ids }, [ids.buffer]);
  } catch (e) {
    self.postMessage({ error: String(e) });
  }
};
