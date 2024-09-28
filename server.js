const express = require('express')
const app = express()
const port = 3000
const mariadb = require('mariadb')
const { check } = require('express-validator')
const { validationResult } = require('express-validator/lib')
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const cors = require('cors')
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'sample',
    port: 3306,
    connectionLimit: 5
})
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'Sample Database API',
            version: '1.3.3.7',
            description: 'Patrick Dutch\'s ITIS-6177 Swagger API assignment.'
        },
        host: '146.190.219.226:' + port,
        basePath: '/'
    },
    apis: ['./server.js']
}
const specs = swaggerJsDoc(swaggerOptions)

app.use(express.json())
app.use(cors())
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs))

/**
 * @swagger
 * /agents:
 *     get:
 *         tags:
 *             - agent
 *         description: Returns all agents.
 *         produces:
 *             - application/json
 *         responses:
 *             200:
 *                 description: Object containing array of all agents.
 */
app.get('/agents', async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM agents");
        res.header('Cache-Control', 'max-age=604800');
        res.json(rows);
    } finally {
        if (conn) conn.end();
    }
})

/**
 * @swagger
 * /companies:
 *     get:
 *         tags:
 *             - company
 *         description: Returns all companies.
 *         produces:
 *             - application/json
 *         responses:
 *             200:
 *                 description: Object containing array of all companies.
 */
app.get('/companies', async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM company");
        res.header('Cache-Control', 'max-age=604800');
        res.json(rows);
    } finally {
        if (conn) conn.end();
    }
})

/**
 * @swagger
 * /companies/{companyId}:
 *     get:
 *         tags:
 *             - company
 *         description: Returns company with given id.
 *         produces:
 *             - application/json
 *         parameters:
 *             - in: path
 *               name: companyId
 *               required: true
 *               type: integer
 *               description: The company id.
 *         responses:
 *             200:
 *                 description: Object containing company with given company id.
 *             404: 
 *                 description: No company found with given company id.
 */
app.get('/companies/:companyId', async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM company where company_id = ?", [req.params.companyId]);
        if(rows.length == 0)
            return res.status(404)
        res.header('Cache-Control', 'max-age=604800');
        res.json(rows);
    } finally {
        if (conn) conn.end();
    }
})

/**
 * @swagger
 * /companies:
 *     post:
 *         tags:
 *             - company
 *         description: Adds new company.
 *         consumes:
 *             - application/json
 *         parameters:
 *             - in: body
 *               name: company
 *               description: The company to create.
 *               schema:
 *                   type: object
 *                   required:
 *                       - companyName
 *                         companyCity
 *                   properties:
 *                       companyName:
 *                           type: string
 *                       companyCity:
 *                          type: string
 *         responses:
 *             201:
 *                 description: Successful create with location header pointing to new company URI.
 */
app.post('/companies', [check('companyName').notEmpty().escape(),
    check('companyCity').notEmpty().isAlpha('en-US', {ignore:" "}).escape()
], async(req, res) => {
    const result = validationResult(req);
    if(result.isEmpty()) {
        let conn;
        try {
            conn = await pool.getConnection();
            const query = "insert into company (company_name, company_city) values (?, ?)";
            const result = await conn.query(query, [req.body.companyName, req.body.companyCity]);
            res.header('Location', '/companies/' + result.insertId);
            return res.sendStatus(201);
        } finally {
            if (conn) conn.end();
        }
    }

    res.send({errors: result.array()});
})

/**
 * @swagger
 * /companies/{companyId}:
 *     put:
 *         tags:
 *             - company
 *         description: Replaces the company with the given company id.
 *         consumes:
 *             - application/json
 *         parameters:
 *             - in: path
 *               name: companyId
 *               required: true
 *               type: integer
 *               description: The company id.
 *             - in: body
 *               name: company
 *               required: true
 *               description: The new company details.
 *               schema:
 *                   type: object
 *                   required:
 *                       - companyName
 *                         companyCity
 *                   properties:
 *                       companyName:
 *                           type: string
 *                       companyCity:
 *                          type: string
 *         responses:
 *             200:
 *                 description: Successfully replaced company with given company id.
 *             404: 
 *                 description: No company found with given company id.
 */
app.put('/companies/:companyId', [check('companyName').notEmpty().escape(),
    check('companyCity').notEmpty().isAlpha('en-US', {ignore:" "}).escape(),
    check('companyId').notEmpty().isInt()
], async(req, res) => {
    const result = validationResult(req);
    if(result.isEmpty()) {
        let conn;
        try {
            conn = await pool.getConnection();
            const existsQuery = "select * from company where company_id = ?";
            const updateQuery = "update company set company_name = ?, company_city = ? where company_id = ?";
            const rows = await conn.query(existsQuery, [req.params.companyId]);
            if(rows.length == 1) {
                await conn.query(updateQuery, [req.body.companyName, req.body.companyCity, req.params.companyId]);
                return res.sendStatus(200);
            } else {
                return res.sendStatus(404);
            }
        } finally {
            if (conn) conn.end();
        }
    }

    res.send({errors: result.array()});
})

/**
 * @swagger
 * /companies/{companyId}:
 *     delete:
 *         tags:
 *             - company
 *         description: Deletes the company with the given company id.
 *         parameters:
 *             - in: path
 *               name: companyId
 *               required: true
 *               type: integer
 *               description: The company id.
 *         responses:
 *             200:
 *                 description: Successfully deleted company with given company id.
 *             404: 
 *                 description: No company found with given company id.
 */
app.delete('/companies/:companyId', check('companyId').notEmpty().isInt(), async(req, res) => {
    const result = validationResult(req);
    if(result.isEmpty()) {
        let conn;
        try {
            conn = await pool.getConnection();
            const existsQuery = "select * from company where company_id = ?";
            const deleteQuery = "delete from company where company_id = ?";
            const rows = await conn.query(existsQuery, [req.params.companyId]);
            if(rows.length == 1) {
                await conn.query(deleteQuery, [req.params.companyId]);
                return res.sendStatus(200);
            } else {
                return res.sendStatus(404);
            }
        } finally {
            if (conn) conn.end();
        }
    }

    res.send({errors: result.array()});
})

/**
 * @swagger
 * /companies/{companyId}:
 *     patch:
 *         tags:
 *             - company
 *         description: Modifies the company with the given company id.
 *         consumes:
 *             - application/json
 *         parameters:
 *             - in: path
 *               name: companyId
 *               required: true
 *               type: integer
 *               description: The company id.
 *             - in: body
 *               name: company
 *               required: true
 *               description: The new company details.
 *               schema:
 *                   type: object
 *                   properties:
 *                       companyName:
 *                           type: string
 *                       companyCity:
 *                          type: string
 *         responses:
 *             200:
 *                 description: Successfully modified company with given company id.
 *             404: 
 *                 description: No company found with given company id.
 */
app.patch('/companies/:companyId', [check('companyName').optional().escape(),
    check('companyCity').optional().isAlpha('en-US', {ignore:" "}).escape(),
    check('companyId').isInt()
], async(req, res) => {
    const result = validationResult(req);
    if(result.isEmpty()) {
        let conn;
        try {
            conn = await pool.getConnection();
            const existsQuery = "select * from company where company_id = ?";
            let updateQuery, updateQueryParms;
            const rows = await conn.query(existsQuery, [req.params.companyId]);
            if(rows.length == 1) {
                if(req.body.companyName && req.body.companyCity) {
                    updateQuery = "update company set company_name = ?, company_city = ? where company_id = ?";
                    updateQueryParms = [req.body.companyName, req.body.companyCity, req.params.companyId]
                } else if(req.body.companyName) {
                    updateQuery = "update company set company_name = ? where company_id = ?";
                    updateQueryParms = [req.body.companyName, req.params.companyId]
                } else if(req.body.companyCity) {
                    updateQuery = "update company set company_city = ? where company_id = ?";
                    updateQueryParms = [req.body.companyCity, req.params.companyId]
                } else {
                    return res.sendStatus(200);
                }
                await conn.query(updateQuery, updateQueryParms);
                return res.sendStatus(200);
            } else {
                return res.sendStatus(404);
            }
        } finally {
            if (conn) conn.end();
        }
    }

    res.send({errors: result.array()});
})

/**
 * @swagger
 * /customers:
 *     get: 
 *         tags:
 *             - customer
 *         description: Returns all customers.
 *         produces:
 *             - application/json
 *         responses:
 *             200:
 *                 description: Object containing array of all customers.
 */
app.get('/customers', async(req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query("SELECT * FROM customer");
        res.header('Cache-Control', 'max-age=604800');
        res.json(rows);
    } finally {
        if (conn) conn.end();
    }
})

app.listen(port, () => {
    console.log(`App listening on localhost:${port}`)
})