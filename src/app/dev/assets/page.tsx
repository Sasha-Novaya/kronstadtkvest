// Временная служебная страница: просмотр готовых картинок квеста. Потом удалим.
import type { Metadata } from "next";
import Image from "next/image";
import assets from "./assets.json";
import styles from "./assets.module.css";

export const metadata: Metadata = {
  title: "Картинки квеста — служебная страница",
  robots: { index: false, follow: false },
};

const BASE = "/quests/kronstadt-walk/images/";

type Asset = (typeof assets)[number];

function Caption({ asset }: { asset: Asset }) {
  return (
    <p className={styles.caption}>
      <strong>{asset.code}</strong> · {asset.id} · {asset.file}
      <br />
      {asset.width} × {asset.height} px · {asset.kb} КБ · исходник: {asset.source}
    </p>
  );
}

export default function AssetsPage() {
  const heroes = assets.filter((a) => a.kind === "hero");
  const others = assets.filter((a) => a.kind !== "hero");

  return (
    <main className={styles.page}>
      <h1>Картинки квеста kronstadt-walk</h1>
      <p>Всего: {assets.length}. Служебная страница, потом удалим.</p>

      <h2>Герои ({heroes.length}) — на клетчатом и тёмном фоне</h2>
      {heroes.map((a) => (
        <section key={a.file} className={styles.item}>
          <Caption asset={a} />
          <div className={styles.pair}>
            <div className={styles.checker}>
              <Image src={BASE + a.file} alt={a.code} width={a.width} height={a.height} unoptimized />
            </div>
            <div className={styles.dark}>
              <Image src={BASE + a.file} alt={a.code} width={a.width} height={a.height} unoptimized />
            </div>
          </div>
        </section>
      ))}

      <h2>Журнал, иллюстрации, схемы, фото ({others.length})</h2>
      {others.map((a) => (
        <section key={a.file} className={styles.item}>
          <Caption asset={a} />
          <Image
            className={styles.flat}
            src={BASE + a.file}
            alt={a.code}
            width={a.width}
            height={a.height}
            unoptimized
          />
        </section>
      ))}
    </main>
  );
}
