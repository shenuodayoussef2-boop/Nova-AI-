
window.YoviaMedia = {

  async generateImage(prompt, aspectRatio = "1:1") {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        aspectRatio
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "فشل إنشاء الصورة");
    }

    return data.image;
  },

  async generateFile(prompt, format = "txt", filename = "yovia-file") {
    const response = await fetch("/api/generate-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        format
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "فشل إنشاء الملف");
    }

    const blob = new Blob(
      ["\uFEFF", data.content],
      { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filename}.${format}`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    return data;
  }

};
