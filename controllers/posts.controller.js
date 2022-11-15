const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const { TwitterApi } = require('twitter-api-v2');
const schedule = require('node-schedule');

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
})

// TWITTER
const client = new TwitterApi({ clientId: "Q0c5ZXhPcWZEUmhMRFJWd3IxZGM6MTpjaQ", clientSecret: "qQpBzMN4StGVZXn5b0U9-h2I1gLovjqceJx96qbqCN3M7jq1_U" });


const crearTweet = async (request, response) => {
    let { texto, usuario, fecha_publicacion, tipo } = request.body;
    const token = await getTwToken(usuario);
    //TODO: post se esta haciendo antes de obtener y loggear el token ¿why?
    const client1 = new TwitterApi(token);
    client1.v2.tweet(texto).then((val) => {
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

const crearAuthLink = async (request, response) => {
    const info = client.generateOAuth2AuthLink("http://localhost:3000/home",{ scope: ['tweet.read', 'users.read', 'offline.access','tweet.write']})
    
    return response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data:info
        });   
}

const crearAuthToken = async (request, response) => {
    const { state, code, codeVerifier } = request.body;

  if (!codeVerifier || !state || !code) {
    return response.status(400).send('You denied the app or your session expired!');
  }

  // Obtain access token

  client.loginWithOAuth2({ code, codeVerifier, redirectUri:"http://localhost:3000/home" })
    .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
        await saveTwToken('15',accessToken)
      
    })
    .catch((err) => response.status(403).send(err));
}

const saveTwToken = async (usuario, token) => {
   
    pool.query('UPDATE usuarios set twitter=$1 where id=$2', [token, usuario], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getTwToken = async (usuario) => {
   
    pool.query('SELECT * from usuarios where id=$1', [usuario], (error, results) => {
        if (error) {
            throw error
        }
        console.log(results.rows[0].twitter);
        return results;
    })
}
//END TWITTER

//Schedule Posts
const programarPost = (request, response) => {
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
    crearAuthToken,
    crearAuthLink,
    crearTweet,
    getPostsByUser
}