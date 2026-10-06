# Relevance and grounded-generation review

These records are a harness dry run. Replace synthetic packs with curated, licensed company evidence before making external quality claims. No LLM may fill final reviewer labels.

For each company × role × offer, reviewer A and B independently assign:

- 0: unsupported, excluded, irrelevant role, or contradictory evidence.
- 1: plausible but weak role/evidence support; investigation required.
- 2: direct dated evidence supports this approved service and the role can plausibly own the decision.

Record reviewer identity, expertise, disagreements, final adjudication and the adjudicator. A job title alone is not company evidence. Company expansion is not proof of an internal staffing deficit. A generic customer reference is not a service-specific case study. Overseas banking operations require domain review.

Freeze 56/12/12 companies before scoring. Related entities share a group ID. Duplicate sources must not cross splits. Record model repository revision, local weight hashes, framework versions, device and origin/license/modifications for every dataset. Test labels never choose training checkpoints.

Compare rules, frozen multilingual embeddings (intfloat/multilingual-e5-small), pretrained multilingual cross-encoder (BAAI/bge-reranker-v2-m3), and the bounded adaptation. The embedding implementation uses the E5 query/passage prefix convention; use E5 weights for that runner. Keep the baseline if held-out NDCG@3 and best-relevant-offer accuracy fail to improve. Latency is reported per offer; benchmark on the same device and report warmup policy. Ranking outputs are not calibrated purchase/reply probabilities.

For retrieval, independently label relevant source IDs for each query, then report Recall@5. Review generated claims with their citations, role fit (0–2), Arabic register (0–2), unsupported assertions and edit effort (characters changed plus elapsed reviewer seconds). The exact-excerpt support helper is a deterministic guard, not a semantic factuality evaluator. Human generation/retrieval gold is still unavailable; no corresponding scores are reported.

Run `prepare.py` only into a new output directory; never overwrite completed labels. `evaluate.py` refuses missing labels, missing identities, incomplete predictions or split leakage. The checked-in 480 slots are deliberately empty.
