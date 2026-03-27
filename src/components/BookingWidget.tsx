"use client";

interface BookingWidgetProps {
  slug: string;
  bookingHotelId: string | null;
  staticPrice: number;
  propertyName: string;
  propertyType: string;
  websiteUrl: string | null;
  hasTaxiService: boolean;
  hostName: string;
  hostDescription: string;
}

export default function BookingWidget({
  websiteUrl,
  hasTaxiService,
  hostName,
  hostDescription,
}: BookingWidgetProps) {
  return (
    <div className="sticky top-32">
      <div className="bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(28,28,25,0.1)] p-8 border border-outline-variant/20">
        <h3 className="font-headline text-xl font-bold text-primary mb-2">
          Book This Stay
        </h3>
        <p className="text-sm text-secondary mb-6">
          Check availability and rates directly with the property for the most up-to-date information.
        </p>

        {/* CTA Button */}
        {websiteUrl ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-tertiary text-on-tertiary py-4 rounded-xl font-bold text-lg hover:bg-tertiary-container shadow-lg shadow-tertiary/20 active:scale-[0.98] transition-all mb-3 text-center"
          >
            Check Availability
            <span className="material-symbols-outlined text-base ml-2 align-middle">
              open_in_new
            </span>
          </a>
        ) : (
          <button
            disabled
            className="w-full bg-surface-container-high text-secondary py-4 rounded-xl font-bold text-lg cursor-not-allowed mb-3"
          >
            Booking Link Coming Soon
          </button>
        )}
        <p className="text-center text-xs text-secondary">
          {websiteUrl
            ? "You\u2019ll be redirected to the property\u2019s own booking page"
            : "Contact us for booking information"}
        </p>

        {/* Taxi service */}
        {hasTaxiService && (
          <div className="mt-8 pt-8 border-t border-outline-variant/30">
            <h4 className="font-bold text-primary mb-4 text-sm">
              Getting There
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">
                  directions_car
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  Nearby Taxi Dispatch
                </span>
              </div>
              <span className="material-symbols-outlined text-primary text-sm filled">
                check_circle
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Host Card */}
      <div className="mt-6 flex items-center gap-4 p-4 bg-surface-container-low rounded-xl">
        <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary">
            person
          </span>
        </div>
        <div>
          <p className="text-xs text-secondary font-bold uppercase tracking-wider">
            Your Host
          </p>
          <p className="text-sm font-bold text-primary">{hostName}</p>
          {hostDescription && (
            <p className="text-[10px] text-secondary">{hostDescription}</p>
          )}
        </div>
      </div>
    </div>
  );
}
