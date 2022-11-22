const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const Pool = require('pg').Pool;

const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
});

const getPostsByUserInCola = (request, response) => {
    let { usuario_id } = request.params;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1 AND tipo = \'cola\' AND fecha_publicacion IS NULL ORDER BY fecha_creacion',
               [usuario_id],
               async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene posts en cola."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

module.exports = {
    getPostsByUserInCola
}
