import { Close } from "@/components/landing/close";
import { Facts } from "@/components/landing/facts";
import { Footer } from "@/components/landing/footer";
import { Game } from "@/components/landing/game";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { Scoring } from "@/components/landing/scoring";
import { Trust } from "@/components/landing/trust";
import { Why } from "@/components/landing/why";
import { getShowcase } from "@/lib/server-api";

export default async function Home() {
  const { data, live } = await getShowcase();
  return (
    <>
      <Nav />
      <main>
        <Hero stars={data.stars} />
        <Facts stats={data.stats} live={live} />
        <Game showcase={data} />
        <Scoring />
        <Why />
        <Trust stats={data.stats} live={live} />
        <Close />
      </main>
      <Footer />
    </>
  );
}
