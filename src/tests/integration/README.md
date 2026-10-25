Testes de integração (pendentes): requerem um PostgreSQL de teste (DATABASE_URL de teste).
Casos previstos: pagamento concorrente (Promise.all de 2x markPaid => 1 efeito), idempotencyKey repetida,
isolamento entre usuários, categoria incompatível, conta de outro usuário.
