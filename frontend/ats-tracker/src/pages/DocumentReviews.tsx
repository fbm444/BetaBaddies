import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { api } from "../services/api";

export function DocumentReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<"all" | "requestor" | "reviewer">("all");

  useEffect(() => {
    fetchReviews();
  }, [role]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUserReviews(role === "all" ? undefined : role);
      if (response.ok && response.data) {
        setReviews(response.data.reviews || []);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviewDetails = async (reviewId: string) => {
    try {
      const response = await api.getReview(reviewId);
      if (response.ok && response.data) {
        setSelectedReview(response.data.review);
      }
    } catch (error) {
      console.error("Failed to fetch review details:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mingcute:loading-line" width={48} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Document Reviews</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRole("all")}
            className={`px-4 py-2 rounded-lg ${
              role === "all" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setRole("requestor")}
            className={`px-4 py-2 rounded-lg ${
              role === "requestor" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setRole("reviewer")}
            className={`px-4 py-2 rounded-lg ${
              role === "reviewer" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            To Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-slate-900 mb-4">Reviews</h2>
            <div className="space-y-2">
              {reviews.map((review) => (
                <button
                  key={review.id}
                  onClick={() => {
                    setSelectedReview(null);
                    fetchReviewDetails(review.id);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedReview?.id === review.id
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-medium text-slate-900 capitalize">
                    {review.documentType} Review
                  </div>
                  <div className="text-sm text-slate-600">
                    {review.status} • {review.reviewerEmail || review.requestorEmail}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Review Details */}
        {selectedReview && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Review Details</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-slate-600">Status:</span>
                <span className="ml-2 font-medium capitalize">{selectedReview.status}</span>
              </div>
              {selectedReview.comments && selectedReview.comments.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Comments</h3>
                  <div className="space-y-3">
                    {selectedReview.comments.map((comment: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm text-slate-600">{comment.reviewerEmail}</div>
                        <div className="mt-1">{comment.commentText}</div>
                        {comment.suggestionText && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-500">
                            <div className="text-sm font-medium text-blue-700">Suggestion:</div>
                            <div className="text-sm text-blue-900">{comment.suggestionText}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

