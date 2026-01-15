"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { debounce } from "@/lib/debounce";
import { CharitySearchResult } from "@/types";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CharitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/charities/search?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        if (response.ok && data.results) {
          setSearchResults(data.results);
          setShowResults(data.results.length > 0);
        }
      } catch (error) {
        setSearchError(
          error instanceof Error ? error.message : "Failed to search charities"
        );
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    performSearch(value);
  };

  const handleCharitySelect = (charity: CharitySearchResult) => {
    router.push(
      `/charity/${charity.reg_charity_number}-${charity.group_subsid_suffix}`
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-zinc-50 to-zinc-100 px-4 py-12">
      <main className="w-full max-w-2xl space-y-8 text-center">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
            Find Funders for Your Charity
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-600">
            Discover relevant funding opportunities using AI-powered matching
            based on historical grant data from 360Giving.
          </p>
        </div>

        {/* Search Section */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Enter charity name or registration number"
              className="h-14 pl-11 pr-4 text-base shadow-sm"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-zinc-400" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <Card className="mt-1 w-full max-w-2xl overflow-hidden text-left shadow-lg">
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((charity) => (
                  <button
                    key={charity.reg_charity_number}
                    onClick={() => handleCharitySelect(charity)}
                    className="w-full border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50 last:border-b-0"
                  >
                    <div className="font-medium text-zinc-900">
                      {charity.charity_name}
                    </div>
                    <div className="text-sm text-zinc-500">
                      Registration: {charity.reg_charity_number}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* No Results */}
          {showResults &&
            searchResults.length === 0 &&
            !isSearching &&
            searchQuery.length >= 2 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No charities found. Try a different search term.
                </AlertDescription>
              </Alert>
            )}

          {/* Error State */}
          {searchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isSearching && (
            <Card className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          )}

          <p className="text-sm text-zinc-500">
            Search for your charity to get started
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4 pt-8 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="font-semibold text-zinc-900">AI-Powered Matching</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Claude AI analyzes your charity profile to find the best funder
              matches
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="font-semibold text-zinc-900">Historical Data</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Insights from 360Giving&apos;s comprehensive grant database
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="font-semibold text-zinc-900">
              Multi-Factor Scoring
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Clear reasoning behind each funder recommendation
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
