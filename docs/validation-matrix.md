# Customer Form Validation Matrix

This matrix defines what each field should accept, what should be blocked, and where validation must happen.

## Rule Levels

- Input guard: Prevent bad typing where possible (input type, inputMode, sanitizer, pattern).
- Step validation: Validate before moving to next form step.
- Server schema: Final required enforcement in API.

## Recommended Field Rules

| Field | Type | Required | Allowed Format | Example Valid | Example Invalid | Input Guard | Step Validation | Server Schema |
|---|---|---|---|---|---|---|---|---|
| corporateName | text | Yes | Letters, numbers, punctuation | ABC Corporation | A | None | min 2 chars | min 2, max 255 |
| tradeName | text | Yes | Letters, numbers, punctuation | ABC Trading | A | None | min 2 chars | min 2, max 255 |
| dateOfBusinessReg | date | No | Date only | 2024-10-01 | hello | type=date | if present, valid date | string/date format check |
| numberOfEmployees | integer | No | Digits only, >= 0 | 25 | 20-30, many | type=number, step 1 | integer only | digits only |
| contactPerson | text | Yes | Letters, spaces, punctuation | Juan Dela Cruz | A | None | min 2 chars | min 2, max 255 |
| emailAddress | email | Yes | RFC email | contact@abc.com | abc.com | type=email | valid email | valid email |
| contactNumber | phone | Yes | Digits plus + ( ) - space | 09123456789 | 09123abc | sanitize phone | required + pattern | no letters |
| telephoneNumber | phone | No | Digits plus + ( ) - space | (02) 8123-4567 | tel123 | sanitize phone | pattern if present | no letters |
| website | url | No | Valid URL | https://abc.com | abc | type=url | URL if present | URL check optional |
| businessAddress | text | Yes | Free text | 123 Main St | 12 | None | min 5 chars | min 5, max 500 |
| cityMunicipality | text | Yes | Letters, spaces, punctuation | Makati City | M | None | min 2 chars | min 2, max 255 |
| landmarks | text | No | Free text | Near city hall | - | None | none | max 500 |
| deliveryAddress | text | No | Free text | 88 Warehouse Rd | - | None | if delivery not same, optional but valid | max 500 |
| deliveryLandmarks | text | No | Free text | Near gate 3 | - | None | if present, valid | max 500 |
| deliveryMobile | phone | No | Digits plus + ( ) - space | 09123456789 | mobile123 | sanitize phone | pattern if present | no letters |
| deliveryTelephone | phone | No | Digits plus + ( ) - space | (02) 8456-7890 | telabc | sanitize phone | pattern if present | no letters |
| lineOfBusiness | enum | No | Listed option values | retail | retailing | dropdown only | must be allowed value | enum whitelist |
| lineOfBusinessOther | text | Cond. | Required only if lineOfBusiness=other | Food export | (empty) | text input | required when other | conditional required |
| businessActivity | enum | No | Listed option values | trading | seller | dropdown only | must be allowed value | enum whitelist |
| businessActivityOther | text | Cond. | Required only if businessActivity=other | Small batch lab | (empty) | text input | required when other | conditional required |
| businessType | enum | Yes | corporation/partnership/sole_proprietor/cooperative/other | corporation | corp | dropdown only | required | enum whitelist |
| tinNumber | tax id | No | Digits and hyphens only | 123-456-789-000 | 12A-456 | sanitize digits/hyphen | pattern if present | digits/hyphens only |
| owners[].name | text | Cond. | Free text if row used | Maria Santos | - | None | if row used, can require name | max 255 |
| owners[].nationality | text | No | Free text | Filipino | - | None | if present valid | max 100 |
| owners[].percentage | number | No | Decimal 0-100, optional % symbol | 50 or 50.5 | fifty | type=number | range 0-100 | percentage regex |
| owners[].contact | phone | No | Digits plus + ( ) - space | 09123456789 | abc123 | sanitize phone | pattern if present | no letters |
| officers[].name | text | Cond. | Free text if row used | Pedro Cruz | - | None | if row used, can require name | max 255 |
| officers[].position | text | No | Free text | President | - | None | if present valid | max 100 |
| officers[].contact | phone | No | Digits plus + ( ) - space | 09123456789 | abc123 | sanitize phone | pattern if present | no letters |
| paymentTerms | enum | No | cod/credit_30/credit_60/credit_90 | cod | cash | dropdown only | must be allowed value | enum whitelist |
| businessLife | decimal | No | Digits with optional decimal, >= 0 | 5 or 5.5 | five | type=number | decimal only | decimal regex |
| howLongAtAddress | decimal | No | Digits with optional decimal, >= 0 | 3 | three | type=number | decimal only | decimal regex |
| numberOfBranches | integer | No | Digits only, >= 0 | 2 | two | type=number, step 1 | integer only | digits only |
| govCertifications | text | No | Free text | BIR, SEC | - | textarea | if present valid | max 2000 |
| tradeReferences[].company | text | No | Free text | XYZ Supply | - | None | if row used, can require company | max 255 |
| tradeReferences[].address | text | No | Free text | Cebu City | - | None | if present valid | max 500 |
| tradeReferences[].contact | phone | No | Digits plus + ( ) - space | 09123456789 | abc123 | sanitize phone | pattern if present | no letters |
| tradeReferences[].years | decimal | No | Digits with optional decimal, >= 0 | 2 or 2.5 | two | type=number | decimal only | decimal regex |
| bankReferences[].bank | text | No | Free text | BDO | - | None | if row used, can require bank | max 255 |
| bankReferences[].branch | text | No | Free text | Makati | - | None | if present valid | max 255 |
| bankReferences[].accountType | text | No | Free text | Savings | - | None | if present valid | max 100 |
| bankReferences[].accountNo | string id | No | Alphanumeric/hyphen (keep flexible) | 00-1234-AB | spaces only | sanitize spaces | if present length >= 4 | max 100 |
| achievements | text | No | Free text | Best SME 2024 | - | textarea | if present valid | max 2000 |
| otherMerits | text | No | Free text | Preferred vendor | - | textarea | if present valid | max 2000 |
| additionalNotes | text | No | Free text | Please call in morning | - | textarea | if present valid | max 2000 |
| customerSignature | signature data | Yes | Data URL from signature pad | data:image/png;base64,... | empty | signature pad required | required | min 1 |

## Conditional and Cross-Field Rules

| Rule | Recommendation |
|---|---|
| lineOfBusiness = other | lineOfBusinessOther must be required |
| businessActivity = other | businessActivityOther must be required |
| deliverySameAsOffice = true | Ignore delivery fields on submit |
| Owners entered | Optional: total ownership must be <= 100; strict mode can require exactly 100 |
| Required document slots | Block final submit if any required slot has 0 files |

## Suggested Error Message Style

- Keep message specific and short.
- Mention expected format directly.
- Avoid generic message like Invalid value.

Examples:

- Contact number must not contain letters.
- TIN must contain numbers and hyphens only.
- Ownership percentage must be a number between 0 and 100.
- Years must be a valid number (e.g. 2 or 2.5).

## Implementation Priority

1. Add input sanitizers to dynamic table contact fields and TIN.
2. Add conditional required validation for Other fields.
3. Add cross-field rule for ownership percentage sum (if needed by policy).
4. Keep server schema as final source of truth.
