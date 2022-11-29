const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const { TwitterApi } = require('twitter-api-v2');
var RedditApi = require('reddit-oauth');
const snoowrap = require('snoowrap');
const axios = require('axios');

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
        insertarTweetBD(usuario, fecha_publicacion, tipo, texto);
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

const crearTweetCola = async (request, response) => {
    let { texto, usuario, tipo } = request.body;
    pool.query('INSERT INTO posts (usuario_id,plataforma,tipo,texto) VALUES ($1, $2, $3, $4)', [usuario, 'Twitter', tipo, texto], (error, results) => {
        if (error) {
            throw error
        }
    })
}

const insertarTweetBD = async (usuario, fecha_publicacion, tipo, texto) => {
    if (!fecha_publicacion) {
        fecha_publicacion = Date.now() / 1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo,texto) VALUES ($1, $2, to_timestamp($3), $4, $5)', [usuario, 'Twitter', fecha_publicacion, tipo, texto], (error, results) => {
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
            const client1 = new TwitterApi(accessToken);
            const meUser = await client1.v2.me({ expansions: ['pinned_tweet_id'] });
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: meUser
            });

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
            await insertarRedditBD(usuario, fecha_publicacion, tipo, texto);

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

const crearRedditPostCola = async (request, response) => {
    let { texto, usuario, tipo } = request.body;
    pool.query('INSERT INTO posts (usuario_id,plataforma,tipo,texto) VALUES ($1, $2, $3, $4)', [usuario, 'Reddit', tipo, texto], (error, results) => {
        if (error) {
            throw error
        }
    })
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
const insertarRedditBD = async (usuario, fecha_publicacion, tipo, texto) => {
    if (!fecha_publicacion) {
        fecha_publicacion = Date.now() / 1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo,texto) VALUES ($1, $2, to_timestamp($3), $4,$5)', [usuario, 'Reddit', fecha_publicacion, tipo, texto], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getRedditPostsByUser = (request, response) => {
    let { usuario } = request.body;
    console.log(usuario);

    pool.query('SELECT * FROM posts WHERE usuario_id = $1 and plataforma = $2', [usuario, 'Reddit'], async (error, results) => {
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
//END REDDIT

//LINKEDIN
var Linkedin = require('node-linkedin')('78glr1c7cxocrx', 'MEwhepYSWesg9Pnk', 'http://localhost:3000/home');

const crearLinkedAuthLink = async (req, res) => {
    var scope = ['r_emailaddress', 'r_liteprofile', 'w_member_social'];

    const link = Linkedin.auth.authorize(scope);

    return res.status(StatusCodes.OK).json({
        message: ReasonPhrases.OK,
        data: link
    });

}
const crearLinkedAuthToken = async (req, res) => {
    const { code, state, user } = req.body;
    Linkedin.auth.getAccessToken(code, state, function (err, results) {
        if (err)
            return console.error(err);

        /**
         * Results have something like:
         * {"expires_in":5184000,"access_token":". . . ."}
         */

        saveLiToken(user, results.access_token);
        getLinkedinId(user);
        return res.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: results
        });
    });

}
const crearLinkedPost = async (req, res) => {

    const { texto, usuario, tipo, fecha_publicacion } = req.body;
    //TODO: post se esta haciendo antes de obtener y loggear el token ¿why?
    const token = await getLiToken(usuario);
    const id = await getLiTokenBD(usuario);
    var data = JSON.stringify({
        "author":"urn:li:person:"+id,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
          "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {
              "text": texto
            },
            "shareMediaCategory": "NONE"
          }
        },
        "visibility": {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      });
      
      var config = {
        method: 'post',
        url: 'https://api.linkedin.com/v2/ugcPosts',
        headers: { 
          'Authorization': "Bearer "+token, 
          'X-Restli-Protocol-Version': '2.0.0', 
          'Content-Type': 'application/json', 
          'Cookie': 'lidc="b=TB03:s=T:r=T:a=T:p=T:g=4800:u=693:x=1:i=1669647442:t=1669716743:v=2:sig=AQHt8BP6xu9DdxOw4FiMcw1Xosd_Cosy"; bcookie="v=2&f7f06dd5-2fae-4196-8fec-f924281882b9"'
        },
        data : data
      };
      
      axios(config)
      .then(function (response) {
        insertarLinkedBD(usuario, fecha_publicacion, tipo, texto);
        res.send("Listo");
      })
      .catch(function (error) {
        console.log(error);
      });

}

const crearLinkedPostCola = async (request, response) => {
    let { texto, usuario, tipo } = request.body;
    pool.query('INSERT INTO posts (usuario_id,plataforma,tipo,texto) VALUES ($1, $2, $3, $4)', [usuario, 'LinkedIn', tipo, texto], (error, results) => {
        if (error) {
            throw error
        }
    })
}

const saveLiToken = async (usuario, token) => {

    pool.query('UPDATE usuarios set linkedin=$1 where id=$2', [token, usuario], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const saveLiId = async (usuario, id) => {

    pool.query('UPDATE usuarios set linkedin_id=$1 where id=$2', [id, usuario], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getLiToken = async (usuario) => {

    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        return res.rows[0].linkedin;

    } catch (err) {
        console.log(err.stack)
    }
}
const getLiTokenBD = async (usuario) => {

    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        return res.rows[0].linkedin_id;

    } catch (err) {
        console.log(err.stack)
    }
}
const getLinkedinId = async (usuario) => {
    const token = await getLiToken(usuario);
    try {
        await axios
            .get("https://api.linkedin.com/v2/me", {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            })
            .catch(function (error) {
                return error
            })
            .then((response) => {
                console.log(response.data);
                saveLiId(usuario, response.data.id);
            });
    } catch (err) {
        return err
    }
}
const insertarLinkedBD = async (usuario, fecha_publicacion, tipo, texto) => {
    if (!fecha_publicacion) {
        fecha_publicacion = Date.now() / 1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo,texto) VALUES ($1, $2, to_timestamp($3), $4,$5)', [usuario, 'LinkedIn', fecha_publicacion, tipo, texto], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}
const getLinkedPostsByUser = (request, response) => {
    let { usuario } = request.body;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1 and plataforma = $2', [usuario, 'LinkedIn'], async (error, results) => {
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
//END LinkedIn
//Schedule Posts


const getPostsByUser = (request, response) => {
    let { usuario } = request.body;

    pool.query('SELECT * FROM posts WHERE usuario_id = $1 and tipo = $2', [usuario,'cola'], async (error, results) => {
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
const deleteCola = (request, response) => {
    let { id } = request.body;
    console.log(id);
    pool.query('DELETE FROM posts WHERE id = $1', [id], async (error, results) => {
        if (error) {
            throw error
        }
        return response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: 'Post Borrado'
        });
    })
}
module.exports = {
    crearAuthToken,
    crearAuthLink,
    crearTweet,
    crearTweetCola,
    getPostsByUser,
    crearRedditAuthToken,
    crearRedditAuthLink,
    crearRedditPost,
    crearRedditPostCola,
    getRedditPostsByUser,
    crearLinkedAuthLink,
    crearLinkedAuthToken,
    crearLinkedPost,
    crearLinkedPostCola,
    getLinkedPostsByUser,
    deleteCola
}