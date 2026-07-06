export interface RolePayload {
  id?: string;
  name?: string;
  slug?: string;
}

export interface AccountDetailsDto {
  accountId: string;
  email: string;
  phone?: string;
  role: RolePayload;
  facilityId?: string | null;
}
