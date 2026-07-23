// §5.5 — surat_ijin (permission letter: late arrival / early leave).
export enum SuratIjinType {
  LATE_ARRIVAL = "late_arrival",
  EARLY_LEAVE = "early_leave",
}

// §5.5 lists only pending/approved for surat_ijin, but an approver needs a way
// to deny a request too — added `rejected` for practical necessity (flagged,
// not silently assumed), mirroring leave_requests' pending/approved/rejected
// shape and §11's "once decided, locked" rule.
export enum SuratIjinStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

// §5.5 — surat_peringatan (SP / warning letter) levels.
export enum SPLevel {
  SP1 = "SP1",
  SP2 = "SP2",
  SP3 = "SP3",
}

// §5.5 — overtime_letter (Surat Lembur). Already documented in
// 03_STRUCTURE.md §5.5 as pending/verified/rejected — no deviation here.
export enum OvertimeLetterStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}
