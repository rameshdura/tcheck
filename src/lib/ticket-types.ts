/**
 * Shared ticket type and vendor label maps.
 * Update these to add new ticket categories or vendors.
 */

export const TYPE_MAP: Record<number, string> = {
    1: 'STANDARD',
    2: 'VIP',
    3: 'EARLY BIRD',
    4: 'STANDARD',
    5: 'VIP',
    6: 'EARLY BIRD',
    7: 'Test Ticket',
};

export const VENDOR_MAP: Record<number, string> = {
    1: 'ticketkhai',
    2: 'yohoticket',
};

/** Returns a human-readable label for a type number, falling back to "Type N". */
export function getTypeName(type: number): string {
    return TYPE_MAP[type] ?? `Type ${type}`;
}

/** Returns a human-readable label for a vendor number, falling back to "Vendor N". */
export function getVendorName(vendor: number): string {
    return VENDOR_MAP[vendor] ?? `Vendor ${vendor}`;
}
