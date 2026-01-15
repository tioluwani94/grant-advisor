"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Search } from "lucide-react";
import NextLink from "next/link";

export default function CharityPageError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.message || "Charity not found"}
        </AlertDescription>
      </Alert>

      <NextLink href="/" passHref>
        <Button className="w-full">
          <Search className="mr-2 h-4 w-4" />
          Search Different Charity
        </Button>
      </NextLink>
    </>
  );
}
