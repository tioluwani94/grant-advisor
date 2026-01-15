import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React from "react";
import NextLink from "next/link";

export default function CharityPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <NextLink href="/" passHref>
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </NextLink>
        {children}
      </div>
    </div>
  );
}
