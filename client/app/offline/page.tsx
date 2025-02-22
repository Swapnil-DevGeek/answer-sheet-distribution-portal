export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">You are offline</h1>
      <p className="text-gray-600">
        Please check your internet connection and try again.
      </p>
    </div>
  );
}