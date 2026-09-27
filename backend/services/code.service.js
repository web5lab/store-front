import Counter from '../schemas/counter.schema.js';

/**
 * Sequential, human-readable numbers: PRD-000001, CUS-000014, SAL-000203.
 *
 * GST billing expects invoice numbers to run in order without gaps a person
 * made up, so they come from an atomic counter rather than random hex.
 */
export const PREFIX = {
    product: 'PRD',
    customer: 'CUS',
    supplier: 'SUP',
    sale: 'SAL',
    purchase: 'PUR',
};

export async function nextCode(key) {
    const counter = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true });
    return `${PREFIX[key]}-${String(counter.seq).padStart(6, '0')}`;
}

/** Make sure the counter is at least `value`, e.g. after importing legacy records. */
export async function bumpCounter(key, value) {
    await Counter.updateOne({ _id: key }, { $max: { seq: value } }, { upsert: true });
}
