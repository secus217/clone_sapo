# Elysia with Bun runtime template v3

## Run it ?

1. Run directly source code with bun

```bash
bun install
bun dev #with watch mode
bun start #without watch mode
```

- Visit http://localhost:3000/ with your browser to see the result.
- Swagger API document: http://localhost:3000/swagger-ui/

2. Run via docker

```bash
docker build -t elysia-bun-runtime-template-v3 .
docker run -p 3000:3000 elysia-bun-runtime-template-v3
```

Open http://localhost:3000/ with your browser to see the result.

## Features updated via v2

- Use mikro-orm for database ORM (not typeorm): https://mikro-orm.io/
- Better authentication and authorization with elysia macro: https://elysiajs.com/patterns/macro.html. Here is how

```typescript
import {Elysia} from "elysia";

new Elysia()
  .get("/admin", async ({user}) => {
    return user
  }, {
    checkAuth: ['admin'], //this route only allow admin role
    detail: {
      tags: ["User"],
      security: [
        {JwtAuth: []}
      ],
    },
  })
  .get("/admin", async ({user}) => {
    return user
  }, {
    checkAuth: ['user'], //this route only allow user role
    detail: {
      tags: ["User"],
      security: [
        {JwtAuth: []}
      ],
    },
  })
```

- Other features from last version still same:
    - Auto parse response to JSON if response is mikro-orm entity
    - Global try catch so feel free to throw error in your code (no need try catch)
    - Use Elysia decorate to singleton the service class. or you can do it your self base on use case
- This template use postgres database, you can change it to any database you want by change it base on the mikro-orm
  document: https://mikro-orm.io/docs/quick-start

## Testing

- Implementing...

## Observability

- Implementing...

***Created by CodingCat, happy coding!***