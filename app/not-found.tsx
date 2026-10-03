import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container-x max-w-xl py-24 text-center">
      <h1 className="text-3xl font-bold">We could not find that page</h1>
      <Link href="/shop" className="btn-primary mt-6">Browse smocks</Link>
    </div>
  );
}
