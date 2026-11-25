export default function ResourceFeedback({ resource, label }) {
  if (resource.error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4 text-red-800">
        <p>Could not load {label}: {resource.error}</p>
        <button type="button" className="mt-2 font-semibold underline" onClick={resource.refresh}>
          Retry {label}
        </button>
      </div>
    );
  }
  if (resource.loading) return <p role="status" className="py-6 text-gray-500">Loading {label}…</p>;
  return null;
}
