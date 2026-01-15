import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search } from "lucide-react";
import NextLink from "next/link";
import {
  getCharityProfile,
  extractCauseAreas,
  extractGeographicFocus,
} from "@/lib/charity-commission";
import { CharityProfile } from "@/types";
import { notFound } from "next/navigation";

interface CharityProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function CharityProfilePage({
  params,
}: CharityProfilePageProps) {
  const { id } = await params;

  // Parse the charity ID format: registrationNumber-suffix
  const [registrationNumber, suffix] = id.split("-");

  if (!registrationNumber || !suffix) {
    notFound();
  }

  let charity: CharityProfile;
  try {
    charity = await getCharityProfile(
      Number(registrationNumber),
      Number(suffix)
    );
  } catch (error) {
    console.error("Error fetching charity profile:", error);
    notFound();
  }

  // Extract structured data from charity profile
  const causeAreas = extractCauseAreas(charity.who_what_where);
  const geographicFocus = extractGeographicFocus(charity);

  return (
    <>
      {/* Charity Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{charity.charity_name}</CardTitle>
          <CardDescription>
            Registration Number: {charity.reg_charity_number}
            {charity.group_subsid_suffix > 0 &&
              `-${charity.group_subsid_suffix}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Income */}
          <div>
            <h3 className="mb-2 font-semibold text-zinc-900">Annual Income</h3>
            <p className="text-zinc-700">
              £{charity.latest_income?.toLocaleString() || "N/A"}
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="mb-2 font-semibold text-zinc-900">Contact</h3>
            <div className="space-y-1 text-zinc-700">
              {charity.email && <p>Email: {charity.email}</p>}
              {charity.phone && <p>Phone: {charity.phone}</p>}
              {charity.web && (
                <p>
                  Website:{" "}
                  <NextLink
                    href={charity.web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {charity.web}
                  </NextLink>
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="mb-2 font-semibold text-zinc-900">Address</h3>
            <address className="not-italic text-zinc-700">
              {charity.address_line_one && <p>{charity.address_line_one}</p>}
              {charity.address_line_two && <p>{charity.address_line_two}</p>}
              {charity.address_line_three && (
                <p>{charity.address_line_three}</p>
              )}
              {charity.address_line_four && <p>{charity.address_line_four}</p>}
              {charity.address_line_five && <p>{charity.address_line_five}</p>}
              {charity.address_post_code && <p>{charity.address_post_code}</p>}
            </address>
          </div>

          {/* Charity Type */}
          <div>
            <h3 className="mb-2 font-semibold text-zinc-900">Charity Type</h3>
            <p className="text-zinc-700">{charity.charity_type}</p>
          </div>

          {/* Geographic Focus */}
          {geographicFocus.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900">
                Geographic Focus
              </h3>
              <div className="flex flex-wrap gap-2">
                {geographicFocus.map((area, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cause Areas */}
          {causeAreas.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900">Cause Areas</h3>
              <div className="flex flex-wrap gap-2">
                {causeAreas.map((cause, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                  >
                    {cause}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <NextLink href={`/charity/${id}/funders`} passHref>
          <Button size="lg" className="flex-1">
            <Search className="mr-2 h-4 w-4" />
            Find Funders
          </Button>
        </NextLink>
        <NextLink href="/" passHref>
          <Button variant="outline" size="lg">
            Search Different Charity
          </Button>
        </NextLink>
      </div>
    </>
  );
}
