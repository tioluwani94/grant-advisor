/**
 * Charity Commission API Types
 */

export interface CharitySearchResult {
  organisation_number: number;
  reg_charity_number: number;
  group_subsid_suffix: number;
  charity_name: string;
  reg_status: string;
  date_of_registration: string;
  date_of_removal: string | null;
}

export interface CharityProfile {
  organisation_number: number;
  reg_charity_number: number;
  group_subsid_suffix: number;
  charity_name: string;
  charity_type: string;
  insolvent: boolean;
  in_administration: boolean;
  prev_excepted_ind: boolean;
  cif_cdf_ind: string | null;
  cio_dissolution_ind: boolean;
  interim_manager_ind: boolean;
  date_of_interim_manager_appt: string | null;
  reg_status: string;
  date_of_registration: string;
  date_of_removal: string | null;
  latest_acc_fin_year_start_date: string;
  latest_acc_fin_year_end_date: string;
  latest_income: number;
  latest_expenditure: number;
  address_line_one: string;
  address_line_two: string;
  address_line_three: string;
  address_line_four: string;
  address_line_five: string | null;
  address_post_code: string;
  phone: string;
  email: string;
  web: string | null;
  charity_co_reg_number: string | null;
  reporting_status: string;
  removal_reason: string | null;
  cio_ind: boolean;
  last_modified_time: string;
  trustee_names: Array<{
    organisation_number: number;
    trustee_name: string;
    trustee_id: number;
  }>;
  who_what_where: Array<{
    classification_code: string;
    classification_type: string;
    classification_desc: string;
  }>;
  CharityAoOCountryContinent: Array<{
    continent: string;
  }>;
  CharityAoOLocalAuthority: Array<{
    local_authority: string;
    metropolitan_county: string | null;
    welsh_ind: boolean;
  }>;
  CharityAoORegion: Array<{
    region: string;
  }>;
  other_names: Array<{
    other_name: string;
    name_type: string;
  }>;
  constituency_name: Array<{
    constituency_name: string;
  }>;
}

/**
 * 360Giving API Types
 */

export interface Organisation {
  org_id: string;
  name: string;
  is_funder: boolean;
  is_recipient: boolean;
  funder_stats?: FunderStats;
  recipient_stats?: RecipientStats;
  last_grant_made_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FunderStats {
  aggregate: {
    grants: number;
    currencies: {
      [currency: string]: {
        avg: number;
        max: number;
        min: number;
        total: number;
        grants: number;
      };
    };
  };
}

export interface RecipientStats {
  aggregate: {
    grants: number;
    currencies: {
      [currency: string]: {
        avg: number;
        max: number;
        min: number;
        total: number;
        grants: number;
      };
    };
  };
}

export interface Grant {
  grant_id: string;
  title: string;
  description?: string;
  amount_awarded: number;
  currency: string;
  award_date: string;
  funder_org_id: string;
  recipient_org_id: string;
  grant_programme?: GrantProgramme[];
  classifications?: Classification[];
  beneficiary_location?: BeneficiaryLocation[];
  raw_data?: CharityProfile;
}

export interface GrantProgramme {
  url?: string;
  code?: string;
  title: string;
  description?: string;
}

export interface Classification {
  code: string;
  title: string;
  vocabulary?: string;
  description?: string;
}

export interface BeneficiaryLocation {
  name: string;
  countryCode?: string;
}

/**
 * AI Matching Types
 */

export interface FunderMatch {
  funder: Organisation;
  match_score: number;
  score_breakdown: ScoreBreakdown;
  reasoning: string;
  similar_charities_funded: SimilarCharityExample[];
}

export interface ScoreBreakdown {
  mission_alignment: number;
  geographic_fit: number;
  size_compatibility: number;
  activity_level: number;
  historical_precedent: number;
}

export interface SimilarCharityExample {
  charity_name: string;
  grant_amount: number;
  award_date: string;
  grant_purpose: string;
}

export interface CharityGeographicData {
  CharityAoOLocalAuthority?: Array<{
    local_authority: string;
    metropolitan_county: string | null;
    welsh_ind: boolean;
  }>;
  CharityAoORegion?: Array<{
    region: string;
  }>;
  CharityAoOCountryContinent?: Array<{
    continent: string;
  }>;
}


export interface OrganisationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    self: string;
    org_id: string;
    name: string;
  }>;
}

export interface OrganisationDetailResponse {
  self: string;
  grants_made: string;
  grants_received: string;
  funder: any;
  recipient: any;
  publisher: any;
  org_id: string;
  name: string;
}

export interface GrantsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    data: any;
    publisher: any;
    recipients: Array<{ self: string; org_id: string }>;
    funders: Array<{ self: string; org_id: string }>;
    grant_id: string;
  }>;
}