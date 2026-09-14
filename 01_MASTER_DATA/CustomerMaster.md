# Customer Master

## Purpose

Customer Master defines the customer reference structures used across Roastery OS.

This entity standardizes customer information to support:
- sales workflows,
- wholesale operations,
- recurring transactions,
- operational analytics,
- and long-term customer relationship management.

Customer references are treated as reusable business entities shared across POS, sales, inventory, reporting, and future CRM-related systems.

---

# Core Philosophy

Customer structures should remain:
- operationally practical,
- relationship-oriented,
- scalable,
- and suitable for both retail and wholesale coffee businesses.

The system should support:
- walk-in customers,
- cafes,
- restaurants,
- resellers,
- offices,
- and wholesale partners
without forcing enterprise-level CRM complexity during MVP stages.

Customer data should support operational workflows rather than become administrative overhead.

---

# Operational Role

Customer Master functions as:
- a sales relationship reference,
- a transaction grouping structure,
- a pricing segmentation layer,
- and an operational analytics entity.

Customer references are commonly used in:
- POS transactions,
- wholesale workflows,
- invoicing,
- sales analytics,
- pricing systems,
- and future recurring order systems.

---

# Relationships

```text
Customer
├── referencedBy → SalesTransaction
├── referencedBy → PaymentRecord
├── referencedBy → WholesalePricing
├── referencedBy → Analytics
└── groupedInto → Customer Segments

Core Fields
Identity Fields
customerId
name
displayName
internalCode
customerType
Examples of customerType:
Retail
Cafe
Restaurant
Wholesale
Reseller
Office
Distributor

Contact Fields
contactPerson
phoneNumber
email
website
socialMedia

Location Fields
address
region
province
country
postalCode

Operational Fields
customerSegment
pricingTier
paymentTerms
creditLimit
preferredDeliveryMethod
activeStatus
Most advanced operational fields should remain optional during MVP implementation.

Sales Reference Fields
taxNumber
invoicePreference
purchaseFrequency
averageOrderVolume
These fields should remain optional during MVP stages.

General Fields
notes
createdAt
updatedAt

Customer Philosophy
Customers should be treated as operational business relationships rather than simple POS records.
Customer relationships may affect:
	•	pricing structures,
	•	sales patterns,
	•	production planning,
	•	recurring inventory demand,
	•	and operational forecasting.
The architecture should support evolving customer relationships without introducing unnecessary CRM bureaucracy.

Customer Identity Principle
Customer represents relationship identity only.
Example:
Customer
≠
SalesTransaction

Customer
Represents:
	•	business relationship,
	•	customer identity,
	•	and reusable sales references.

SalesTransaction
Represents:
	•	actual sales activity,
	•	operational transaction records,
	•	payment activity,
	•	and inventory deduction events.
This separation preserves:
	•	modular consistency,
	•	sales flexibility,
	•	and operational scalability.

Customer Segmentation Principle
A single customer structure may support:
	•	pricing segmentation,
	•	wholesale grouping,
	•	recurring order analysis,
	•	and operational analytics.
Examples:
Retail Customer
Cafe Partner
Wholesale Buyer
Office Client
Reseller
Customer segmentation should remain flexible and operationally practical.

Naming Convention
Entity Name:
Customer
Primary Identifier:
customerId
Related References:
customerType
pricingTier
customerSegment
Naming should follow standards defined in:
	•	NamingConvention.md
	•	DataModel.md

Used By Modules
Customer Master is shared across:
	•	POS Engine
	•	Sales Transactions
	•	Wholesale System
	•	Analytics Dashboard
	•	Future CRM Systems
	•	Future AI Systems

MVP Scope
The MVP implementation should remain lightweight.
Required MVP fields:
customerId
name
customerType
phoneNumber
region
notes
Basic MVP customer types:
Retail
Cafe
Wholesale
Reseller
Advanced CRM and sales analytics metadata may be added progressively in future operational stages.

Future Expansion Possibilities
Future versions may support:
	•	recurring order systems,
	•	subscription systems,
	•	customer loyalty systems,
	•	wholesale contract management,
	•	sales forecasting,
	•	customer analytics,
	•	and AI-assisted customer insights.
Future expansion should extend the structure without redesigning the operational foundation.

Architectural Notes
Customer Master is designed as a reusable business reference entity.
Multiple transactional and operational entities may reference the same Customer structure.
This entity should remain:
	•	stable,
	•	reusable,
	•	operationally meaningful,
	•	and loosely coupled from transactional workflows.
Customer structures should support operational clarity while remaining flexible enough for evolving specialty coffee business relationships and sales models.

