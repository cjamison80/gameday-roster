import React from 'react';

export function SkeletonLine({ w = 'full', h = 4, rounded = 'lg' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-${rounded} w-${w} h-${h}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 animate-pulse rounded-lg w-3/4" />
          <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-1/2" />
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 animate-pulse rounded-full w-16" />
        <div className="h-6 bg-gray-200 animate-pulse rounded-full w-16" />
        <div className="h-6 bg-gray-200 animate-pulse rounded-full w-12" />
      </div>
      <div className="h-px bg-gray-100" />
      <div className="flex gap-4">
        <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-24" />
        <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-20" />
        <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-12" />
      </div>
    </div>
  );
}

export function SkeletonPlayerCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 animate-pulse rounded-lg w-2/3" />
          <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-1/2" />
          <div className="flex gap-1 mt-1">
            <div className="h-5 bg-gray-200 animate-pulse rounded-full w-14" />
            <div className="h-5 bg-gray-200 animate-pulse rounded-full w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}