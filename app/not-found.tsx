import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h1>404</h1>
      <p>
        <Link href="/">← /</Link>
      </p>
    </main>
  );
}
