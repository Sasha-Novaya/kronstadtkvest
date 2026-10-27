import Image from "next/image";

export default function Home() {
  return (
    <main className="home">
      <div className="intro">
        <p className="badge">Аудиоквесты · Кронштадт</p>
        <h1 className="title">Привет, экипаж!</h1>
        <p className="subtitle">
          Скоро здесь начнётся приключение с капитаном Федотом Селёдкиным и
          чайкой Клушей
        </p>
      </div>

      <div className="heroes">
        <Image
          className="hero hero-fedot"
          src="/images/fedot.webp"
          alt="Капитан Федот Селёдкин"
          width={1000}
          height={1000}
          priority
        />
        <Image
          className="hero hero-klusha"
          src="/images/klusha.webp"
          alt="Чайка Клуша"
          width={796}
          height={800}
          priority
        />
      </div>
    </main>
  );
}
