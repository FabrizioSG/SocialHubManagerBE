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
    const { state, code, codeVerifier, user } = request.body;

    if (!codeVerifier || !state || !code) {
        return response.status(400).send('You denied the app or your session expired!');
    }

    // Obtain access token

    client.loginWithOAuth2({ code, codeVerifier, redirectUri: "http://localhost:3000/home" })
        .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
            await saveTwToken(user, accessToken)

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

    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        console.log(res.rows[0].twitter)
        return res.rows[0].twitter;

      } catch (err) {
        console.log(err.stack)
      }
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
    const { state, code, user } = req.body;
    reddit.oAuthTokens(
        'reddit',
        { state: state, code: code },
        function (success) {
            // Print the access and refresh tokens we just retrieved
            console.log(reddit.access_token);
            console.log(reddit.refresh_token);
            saveRdToken(user, reddit.refresh_token)

            return res.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: reddit.access_token
            });
        }
    );
}
const crearRedditPost = async (req, res) => {

    const { texto, usuario, tipo, fecha_publicacion } = req.body;
    const token = await getRdToken(usuario);
    const r = new snoowrap({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        clientId: '28T22kreGnYJ36AGZKix7Q',
        clientSecret: 'iC1omzDOWGpE6q3EdyckOkdvN8nHMA',
        refreshToken: token
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
    
    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        console.log(res.rows[0].reddit)
        return res.rows[0].reddit;

      } catch (err) {
        console.log(err.stack)
      }
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

//END REDDIT

//LINKEDIN
var Linkedin = require('node-linkedin')('78glr1c7cxocrx', 'MEwhepYSWesg9Pnk', 'http://localhost:3000/home');

const crearLinkedAuthLink = async (req, res) => {
    var scope = [ 'r_emailaddress','r_liteprofile','w_member_social'];

    const link = Linkedin.auth.authorize(scope);

        return res.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: link
        });
    
}
const crearLinkedAuthToken = async (req, res) => {
    const { code, state, user } = req.body;
    Linkedin.auth.getAccessToken(code, state, function(err, results) {
        if ( err )
            return console.error(err);
 
        /**
         * Results have something like:
         * {"expires_in":5184000,"access_token":". . . ."}
         */
 
        console.log(results);
        saveLiToken(user,results.access_token);
        return res.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: results
        });
    });

}
const crearLinkedPost = async (req, res) => {

    const { texto, usuario, tipo, fecha_publicacion } = req.body;
    //TODO: post se esta haciendo antes de obtener y loggear el token ¿why?
    const token = await getRdToken(usuario);
    var linkedin = Linkedin.init('AQVhyKt0hU7lxoOk1P-IBQkAHOg6bSLSooBvMCpUUKM1RsWT30LA-whK6jEFEGgKWF7sYYMPV0aInnnQ1RpaRHh7Hberxk52HVaeJ0xH-t9FA_9KKRTHDic9ytmA7jZDrGbmszvN83-Bqr6Rg8kTq1fsTjYxqm-wu75_cBBNsI9T0M4VUgFne4lRZN-uHBYC7GuzedxIsQsYl8vGE8dRvy11BMNPYRT-sOIJcPLfQCyalND7JOe2eCTA-zkKxmLZvUGr91TbRf3L1rn__FOYuNaDBtOSEFngBsKiBwluBDBggYtrmCffgeTcFlkmUN3HpcL-PDl7JtLKlKN9umf4gCOh5IO11w');

    //TODO: Crear el post en linkedin
    
}
const saveLiToken = async (usuario, token) => {

    pool.query('UPDATE usuarios set linkedin=$1 where id=$2', [token, usuario], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getLiToken = async (usuario) => {

    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        console.log(res.rows[0].linkedin)
        return res.rows[0].linkedin;

      } catch (err) {
        console.log(err.stack)
      }
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
    crearRedditPost,
    crearLinkedAuthLink,
    crearLinkedAuthToken,
    crearLinkedPost
}