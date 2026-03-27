"use client";

import { useState, useEffect } from "react";
import type { ReviewsResponse, BookingReview } from "@/lib/booking-types";

interface BookingReviewsProps {
  slug: string;
  bookingHotelId: string | null;
  curatedRating: number;
  curatedReviewCount: number;
}

export default function BookingReviews({
  slug,
  bookingHotelId,
  curatedRating,
  curatedReviewCount,
}: BookingReviewsProps) {
  const [reviews, setReviews] = useState<BookingReview[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"booking" | "static">("static");

  useEffect(() => {
    if (!bookingHotelId) {
      setLoading(false);
      return;
    }

    async function fetchReviews() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/booking/reviews?slug=${slug}&page=${page}`
        );
        if (res.ok) {
          const data: ReviewsResponse = await res.json();
          if (data.source === "booking" && data.data) {
            if (page === 1) {
              setReviews(data.data.reviews);
            } else {
              setReviews((prev) => [...prev, ...data.data!.reviews]);
            }
            setAverageScore(data.data.averageScore);
            setTotalCount(data.data.totalCount);
            setTotalPages(data.data.totalPages);
            setSource("booking");
          }
        }
      } catch {
        // Fall back to static display
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [slug, bookingHotelId, page]);

  // Fallback: static curated data
  if (source === "static" && !loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-headline text-3xl font-bold text-primary">
            What Other Walkers Say
          </h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1 text-tertiary">
            {Array.from({ length: Math.floor(curatedRating) }).map((_, i) => (
              <span
                key={i}
                className="material-symbols-outlined text-sm filled"
              >
                star
              </span>
            ))}
          </div>
          <span className="font-bold text-primary">{curatedRating}</span>
          <span className="text-secondary text-sm">
            ({curatedReviewCount} reviews)
          </span>
        </div>
        <p className="text-sm text-secondary">
          Detailed reviews will be available soon.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-headline text-3xl font-bold text-primary">
          What Other Walkers Say
        </h2>
      </div>

      {/* Score summary */}
      {averageScore > 0 && (
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-tertiary text-white text-2xl font-bold w-14 h-14 rounded-xl flex items-center justify-center">
            {averageScore.toFixed(1)}
          </div>
          <div>
            <p className="font-bold text-primary">
              {averageScore >= 9
                ? "Exceptional"
                : averageScore >= 8
                  ? "Excellent"
                  : averageScore >= 7
                    ? "Very Good"
                    : "Good"}
            </p>
            <p className="text-sm text-secondary">
              {totalCount} verified review{totalCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && reviews.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10"
            >
              <div className="h-4 w-24 bg-surface-container-high rounded animate-pulse mb-3" />
              <div className="h-4 w-48 bg-surface-container-high rounded animate-pulse mb-2" />
              <div className="h-12 w-full bg-surface-container-high rounded animate-pulse mb-4" />
              <div className="h-3 w-32 bg-surface-container-high rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Reviews grid */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm"
            >
              {/* Score */}
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-tertiary/10 text-tertiary text-xs font-bold px-2 py-0.5 rounded">
                  {review.score.toFixed(1)}
                </span>
                {review.travellerType && (
                  <span className="text-[10px] text-secondary uppercase tracking-wider font-bold">
                    {review.travellerType}
                  </span>
                )}
              </div>

              {/* Title */}
              {review.title && (
                <p className="font-bold text-primary mb-2">
                  &ldquo;{review.title}&rdquo;
                </p>
              )}

              {/* Positive */}
              {review.positiveText && (
                <div className="flex gap-2 mb-2">
                  <span className="material-symbols-outlined text-green-600 text-sm mt-0.5">
                    add_circle
                  </span>
                  <p className="text-on-surface-variant text-sm">
                    {review.positiveText}
                  </p>
                </div>
              )}

              {/* Negative */}
              {review.negativeText && (
                <div className="flex gap-2 mb-2">
                  <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">
                    remove_circle
                  </span>
                  <p className="text-on-surface-variant text-sm">
                    {review.negativeText}
                  </p>
                </div>
              )}

              {/* Author */}
              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-xs font-bold text-on-secondary-fixed">
                  {review.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-primary">
                    {review.author}
                  </p>
                  {review.authorCountry && (
                    <p className="text-[10px] text-secondary">
                      {review.authorCountry}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-2 px-6 py-3 bg-surface-container-high text-primary rounded-lg font-bold text-sm hover:bg-secondary-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">
              expand_more
            </span>
            Load more reviews
          </button>
        </div>
      )}

      {loading && reviews.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="h-8 w-8 border-2 border-tertiary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </section>
  );
}
