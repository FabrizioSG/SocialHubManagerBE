const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const { TwitterApi } = require('twitter-api-v2');

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
})

const T = new TwitterApi({
    appKey: "W0SfhdIFlIEjBAiEuVlNOShIG",
    appSecret: "7mxEw05rtuTQ1GVEqhChsf400mX5WwJm6QYrxXrEyv9Uy4xV4K",
    accessToken: "1589277394107514880-SvQJ9k47tDXGWoYn1fk29l5nDrDz98",
    accessSecret: "z4AIuz8C63BLHUqwvBwvh3u1Lr5JnPjommUzSsjH8opLf",
});

const crearTweet = (request, response) => {
    let { texto, usuario, fecha_publicacion, tipo } = request.body;
    T.v2.tweet(texto).then((val) => {
        insertarTweetBD(usuario, fecha_publicacion, tipo);
        return response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: (val)
        });
    }).catch((err) => {
        return response.status(StatusCodes.BAD_REQUEST).json({
            message: ReasonPhrases.BAD_REQUEST,
            data: err
        });
    })
}

const insertarTweetBD = async (usuario, fecha_publicacion, tipo) => {
    if (!fecha_publicacion) {
        fecha_publicacion = Date.now() / 1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo) VALUES ($1, $2, to_timestamp($3), $4)', [usuario, 'Twitter', fecha_publicacion, tipo], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}

const getPostsByUser = (request, response) => {
    let { usuario_id } = request.params;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1', [usuario_id], async (error, results) => {
        if (error) {
            throw error
        }
        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene posts"
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    })
}


module.exports = {

    crearTweet,
    getPostsByUser
}