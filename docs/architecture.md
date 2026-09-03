# CRISPR System Architecture

This document serves as an overview of the CRISPR platform architecture. For comprehensive architecture details, including system boundaries, sequence diagrams, and component models, please refer to the main architecture document.

## Related Documents
- [Detailed System Architecture](architecture/system_architecture.md) - Contains full Mermaid sequence diagrams and component details.
- [Database Schema](api_schemas.md) - Contains data storage structures.

## Core Components
- **Frontend App**: React/TypeScript application powered by Vite.
- **Backend Service**: FastAPI server handling risk, scenarios, and optimizations.
- **Machine Learning**: XGBoost pipeline for vulnerability incident prediction.
- **Financial Engine**: FAIR-based EAL calculation with Monte Carlo simulation support.
