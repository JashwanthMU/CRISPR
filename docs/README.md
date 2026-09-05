# CRISPR Documentation

This directory is the canonical documentation entry point. Documentation is
grouped by purpose so operational instructions do not become mixed with model
methodology or historical implementation notes.

## Start here

- [Complete setup](deployment/setup.md)
- [Project structure](development/project-structure.md)
- [Implementation roadmap](development/roadmap.md)
- [System architecture](architecture/system_architecture.md)
- [API contracts](api/contracts.md)

## Architecture

- [Architecture overview](architecture.md)
- [Detailed system architecture](architecture/system_architecture.md)

## Deployment

- [Local and Docker setup](deployment/setup.md)
- [AWS deployment](deployment/aws.md)

## Risk methodology and governance

- [Technical methodology](methodology/methodology.md)
- [Expected Annual Loss](methodology/eal.md)
- [Monte Carlo assumptions](methodology/monte-carlo.md)
- [Control mappings](methodology/control-mappings.md)
- [Financial risk governance](governance/financial-risk.md)

## Machine learning

- [Incident prediction model card](ml/MODEL_CARD.md)
- [Validation status](ml/validation_status.md)

## Historical and supporting material

- `optimisation/` contains the optimizer design and integration guide.
- `presentation/` contains the SIH presentation artifact.

When behavior changes, update the closest canonical document in the same pull
request. Avoid creating a second document for an existing topic.
