export interface Document {
    documentType: string;
    documentNumber: string;
    fileUrl: string;
}

export interface PreviousCompany {
    companyName: string;
    duration: string;
    designation: string;
}

export interface Policy {
    policyName: string;
    acknowledgedOn: string;
    signature: boolean;
}

export interface Employee {
    fullName: string;
    dob: string;
    gender: string;
    email: string;
    phone: string;
    documents: Document[];
    previousCompanyDetails: PreviousCompany[];
    policyAcknowledgment: Policy[];
}
