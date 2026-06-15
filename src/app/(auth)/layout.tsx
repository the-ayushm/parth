import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/images/logo/logo.jpeg"
            alt="Surefy Logo"
            width={80}
            height={80}
            className="mb-4 rounded-lg"
          />
          <h1 className="text-3xl font-bold text-primary-600">Chotu</h1>
          <p className="mt-2 text-gray-600">API Management Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
