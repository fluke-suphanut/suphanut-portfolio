// `/`: internal chooser between the three prototypes. No motion; C's fonts and colors.
import Link from "next/link";
import { getContent } from "@/lib/content";
import { VARIANTS } from "@/lib/copy";
import { anuphan, plexMonoC, plexThaiC } from "./fonts-c";
import "./c/c.css";

export default async function Home() {
  const { profile } = await getContent();
  return (
    <div className={`vc chooser ${anuphan.variable} ${plexThaiC.variable} ${plexMonoC.variable}`}>
      <main className="chooser-main">
        <p className="eyebrow">{profile.title}</p>
        <h1>{profile.name}</h1>
        <ul className="chooser-list">
          {VARIANTS.map((v) => (
            <li key={v.href}>
              <Link href={v.href}>{v.label}</Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
