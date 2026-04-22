import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "カラオケレパ",
    short_name: "カラレパ",
    description:
      "DAM カラオケ採点履歴を取り込んで、レパートリーとセトリを管理するダッシュボード。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a14",
    theme_color: "#ff2a8a",
    lang: "ja",
    categories: ["music", "entertainment", "utilities"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
