const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const { TwitterApi } = require('twitter-api-v2');
const schedule = require('node-schedule');
var RedditApi = require('reddit-oauth');
const snoowrap = require('snoowrap');

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
    const info = client.generateOAuth2AuthLink("http://localhost:3000/home", { scope: ['tweet.read', 'users.read', 'offline.access', 'tweet.write'] })

    return response.status(StatusCodes.OK).json({
        message: ReasonPhrases.OK,
        data: info
    });
}

const crearAuthToken = async (request, response) => {
    const { state, code, codeVerifier } = request.body;

    if (!codeVerifier || !state || !code) {
        return response.status(400).send('You denied the app or your session expired!');
    }

    // Obtain access token

    client.loginWithOAuth2({ code, codeVerifier, redirectUri: "http://localhost:3000/home" })
        .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
            await saveTwToken('15', accessToken)

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

//REDDIT

var reddit = new RedditApi({
    app_id: '28T22kreGnYJ36AGZKix7Q',
    app_secret: 'iC1omzDOWGpE6q3EdyckOkdvN8nHMA',
    redirect_uri: 'http://localhost:3000/home'
});

const crearRedditAuthLink = async (req, res) => {

    const link = reddit.oAuthUrl('reddit', 'submit');

    return res.status(StatusCodes.OK).json({
        message: ReasonPhrases.OK,
        data: link
    });


}
const crearRedditAuthToken = async (req, res) => {
    const { state, code } = req.body;
    reddit.oAuthTokens(
        'reddit',
        { state: state, code: code },
        function (success) {
            // Print the access and refresh tokens we just retrieved
            console.log(reddit.access_token);
            console.log(reddit.refresh_token);
            saveRdToken('15', reddit.refresh_token)

            return res.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: reddit.access_token
            });
        }
    );
}
const crearRedditPost = async (req, res) => {

    const { texto, usuario, tipo, fecha_publicacion } = req.body;
    //TODO: post se esta haciendo antes de obtener y loggear el token ¿why?
    const token = await getRdToken(usuario);
    const r = new snoowrap({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        clientId: '28T22kreGnYJ36AGZKix7Q',
        clientSecret: 'iC1omzDOWGpE6q3EdyckOkdvN8nHMA',
        refreshToken: '42511571-C0rF1Xme-P_aNN3RSiwRXhj4wfztlA'
    });
    try {
        const post = r.getSubreddit('SocialHubMngr').submitSelfpost({ title: 'Title', text: texto });
        try {
            await insertarRedditBD(usuario, fecha_publicacion, tipo);

        } catch (err) {
            console.log(err)
        }
        return res.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: post
        });


    } catch (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: ReasonPhrases.INTERNAL_SERVER_ERROR,
            data: err
        });
    }
}
const saveRdToken = async (usuario, token) => {

    pool.query('UPDATE usuarios set reddit=$1 where id=$2', [token, usuario], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getRdToken = async (usuario) => {

    pool.query('SELECT * from usuarios where id=$1', [usuario], (error, results) => {
        if (error) {
            throw error
        }
        console.log(results.rows[0].reddit);
        return results;
    })
}
const insertarRedditBD = async (usuario, fecha_publicacion, tipo) => {
    if (!fecha_publicacion) {
        fecha_publicacion = Date.now() / 1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo) VALUES ($1, $2, to_timestamp($3), $4)', [usuario, 'Reddit', fecha_publicacion, tipo], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}

//Schedule Posts
const programarPost = (request, response) => {
    let { usuario_id } = request.params;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1', [usuario_id], async (error, results) => {
        if (error) {
            throw error
        }
        if (results.rows.length < 1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene posts"
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: results.rows
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
        if (results.rows.length < 1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Este usuario no tiene posts"
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: results.rows
            });
        }
    })
}
module.exports = {
    crearAuthToken,
    crearAuthLink,
    crearTweet,
    getPostsByUser,
    crearRedditAuthToken,
    crearRedditAuthLink,
    crearRedditPost
}