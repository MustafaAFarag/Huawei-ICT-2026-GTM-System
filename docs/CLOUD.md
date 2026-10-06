# ModelArts primary path; Azure development fallback

No cloud account, region, balance, quota, weight artifact or endpoint has been verified in this session. There is no deployed cloud service.

Week-one operator checks: available ModelArts region and PyTorch training image; accepted local model format; GPU memory for the chosen BGE weights; storage bucket permissions; approved evidence/label location; training budget and output location. Confirm the selected model license and freeze its repository revision and SHA256 weights in the run record. If any check fails, use the same offline scripts in Azure development compute and record the reason. Do not divide a single experiment between two primary paths.

Upload the project, the independently reviewed dataset, and frozen model directories to the selected job. Use Python 3.11+ and explicitly pinned PyTorch/transformers builds compatible with that image; version selection is pending a real compute environment. The runtime application itself requires only the Python standard library.

Example job entry point, after local labels and model paths exist:

```bash
python evaluation/train.py --data /data/labels --model-path /data/bge-reranker-v2-m3 --output /outputs/adapted-bge --device cuda --steps 60
python evaluation/predict.py --data /data/labels --method cross-encoder --model-path /outputs/adapted-bge --output /outputs/adapted-predictions.json
python evaluation/evaluate.py --data /data/labels --predictions /outputs/adapted-predictions.json --output /outputs/adapted-results.json
```

Run the same predictor/evaluator for pretrained and embedding baselines. Compare held-out reports and preserve stronger baseline behavior. No gain is assumed. These commands have not been executed with neural weights here.
