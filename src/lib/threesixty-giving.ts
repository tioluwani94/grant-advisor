/**
 * 360Giving API Client
 * Documentation: https://api.threesixtygiving.org/api/v1/swagger-ui/
 * Rate Limit: 2 requests per second
 */

import { GrantsResponse, OrganisationDetailResponse, OrganisationListResponse } from "@/types";

const API_BASE_URL = 'https://api.threesixtygiving.org/api/v1';
const RATE_LIMIT_DELAY = 500; // 500ms = 2 requests/second

/**
 * Rate limiter to ensure we don't exceed API limits
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const fn = this.queue.shift();
    
    if (fn) {
      await fn();
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    this.processing = false;
    if (this.queue.length > 0) {
      this.process();
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Response types from 360Giving API
 */


/**
 * Get paginated list of organisations
 */
export async function getOrganisations(
  limit: number = 1000,
  offset: number = 0
): Promise<OrganisationListResponse> {
  return rateLimiter.add(async () => {
    const url = `${API_BASE_URL}/org/?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`360Giving API error: ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Get detailed information about a specific organisation
 */
export async function getOrganisationDetail(orgId: string): Promise<OrganisationDetailResponse> {
  return rateLimiter.add(async () => {
    const url = `${API_BASE_URL}/org/${encodeURIComponent(orgId)}/`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Organisation not found');
      }
      throw new Error(`360Giving API error: ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Get grants made by a specific organisation (funder)
 */
export async function getGrantsMade(
  orgId: string,
  limit: number = 100,
  offset: number = 0
): Promise<GrantsResponse> {
  return rateLimiter.add(async () => {
    const url = `${API_BASE_URL}/org/${encodeURIComponent(orgId)}/grants_made/?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Organisation not found');
      }
      throw new Error(`360Giving API error: ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Get grants received by a specific organisation (recipient)
 */
export async function getGrantsReceived(
  orgId: string,
  limit: number = 100,
  offset: number = 0
): Promise<GrantsResponse> {
  return rateLimiter.add(async () => {
    const url = `${API_BASE_URL}/org/${encodeURIComponent(orgId)}/grants_received/?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Organisation not found');
      }
      throw new Error(`360Giving API error: ${response.status}`);
    }

    return response.json();
  });
}

/**
 * Fetch all organisations with pagination (helper function)
 */
export async function* fetchAllOrganisations(): AsyncGenerator<OrganisationListResponse['results']> {
  let offset = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const response = await getOrganisations(limit, offset);
    yield response.results;

    hasMore = response.next !== null;
    offset += limit;
  }
}

/**
 * Fetch all grants for an organisation with pagination (helper function)
 */
export async function* fetchAllGrantsMade(orgId: string): AsyncGenerator<GrantsResponse['results']> {
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await getGrantsMade(orgId, limit, offset);
    yield response.results;

    hasMore = response.next !== null;
    offset += limit;
  }
}
