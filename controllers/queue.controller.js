const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const Pool = require('pg').Pool;
const { TwitterApi } = require('twitter-api-v2');
const RedditApi = require('reddit-oauth');
const snoowrap = require('snoowrap');

const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
});

const client = new TwitterApi({ clientId: "Q0c5ZXhPcWZEUmhMRFJWd3IxZGM6MTpjaQ", clientSecret: "qQpBzMN4StGVZXn5b0U9-h2I1gLovjqceJx96qbqCN3M7jq1_U" });

const reddit = new RedditApi({ app_id: '28T22kreGnYJ36AGZKix7Q', app_secret: 'iC1omzDOWGpE6q3EdyckOkdvN8nHMA', redirect_uri: 'http://localhost:3000/home' });

const Linkedin = require('node-linkedin')('78glr1c7cxocrx', 'MEwhepYSWesg9Pnk', 'http://localhost:3000/home');

const getPostsInCola = (request, response) => {
    pool.query('SELECT * FROM posts WHERE tipo = \'cola\' AND fecha_publicacion IS NULL ORDER BY fecha_creacion',
               async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No existen posts en cola."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

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

const getSchedules = (request, response) => {
    pool.query('SELECT * FROM schedules ORDER BY day_of_week, time_of_day',
            async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No hay horarios de publicación."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getSchedulesByDay = (request, response) => {
    let date = new Date();
    console.log(date.getDay());

    pool.query('SELECT * FROM schedules WHERE day_of_week = $1 ORDER BY day_of_week, time_of_day',
            [date.getDay()],
            async (error, results) => {
        
        if (error) {
            throw error
        }

        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "No hay horarios de publicación."
            });
        } else {
            return response.status(StatusCodes.OK).json({
                message:ReasonPhrases.OK,
                data:results.rows
            });
        }
    });
}

const getSchedulesAndPostsByUserAndDayAndTime = async () => {
    let date = new Date();
    let hour = date.getHours();
    let minutes = date.getMinutes();
    if (hour < 10) {
        hour = '0' + hour;        
    }
    if (minutes < 10) {
        minutes = '0' + minutes;        
    }
    let time = '08:05:00';

    const { rows } = await pool.query('SELECT u.id AS usuario_id, s.day_of_week, s.time_of_day, p.id AS post_id, p.plataforma, p.texto, p.fecha_creacion FROM usuarios AS u JOIN schedules AS s ON u.id = s.usuario_id JOIN posts AS p ON u.id = p.usuario_id WHERE p.fecha_publicacion IS NULL AND p.tipo = \'cola\' AND s.day_of_week = $1 AND s.time_of_day = $2 ORDER BY usuario_id, p.fecha_creacion', [date.getDay(), time]);
    
    let filteredRows = [];
    filteredRows.push(rows[0]);

    rows.forEach(row => {
        if (row.plataforma === "Twitter") {
            publicarTweet(row.texto, row.usuario_id);
            pool.query('UPDATE posts SET fecha_publicacion = $1 WHERE id = $2', [new Date(), row.post_id]);
        }
        if (row.plataforma === "Reddit") {
            publicarRedditPost(row.texto, row.usuario_id);
            pool.query('UPDATE posts SET fecha_publicacion = $1 WHERE id = $2', [new Date(), row.post_id]);
        }
        if (row.plataforma === "LinkedIn") {
            publicarLinkedPost(row.texto, row.usuario_id);
            pool.query('UPDATE posts SET fecha_publicacion = $1 WHERE id = $2', [new Date(), row.post_id]);
        }
    });
}

const publicarTweet = async ( texto, usuario ) => {
    const token = await getTwToken(usuario);
    const client1 = new TwitterApi(token);
    client1.v2.tweet(texto).then((val) => {
        console.log(val);
        return val;
    }).catch((err) => {
        return err;
    })
}

const getTwToken = async (usuario) => {
    try {
        const res = await pool.query('SELECT * from usuarios where id=$1', [usuario])
        console.log(res.rows[0].twitter)
        return res.rows[0].twitter;

      } catch (err) {
        //console.log(err.stack)
      }
}

const publicarRedditPost = async ( texto, usuario ) => {
    const token = await getRdToken(usuario);
    const r = new snoowrap({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
        clientId: '28T22kreGnYJ36AGZKix7Q',
        clientSecret: 'iC1omzDOWGpE6q3EdyckOkdvN8nHMA',
        refreshToken: token
    });

    try {
        const post = r.getSubreddit('SocialHubMngr').submitSelfpost({ title: 'Title', text: texto });
        return post;
    } catch (err) {
        return err;
    }
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

const publicarLinkedPost = async ( texto, usuario ) => {
    const token = await getLiToken(usuario);
    var linkedin = Linkedin.init('AQVhyKt0hU7lxoOk1P-IBQkAHOg6bSLSooBvMCpUUKM1RsWT30LA-whK6jEFEGgKWF7sYYMPV0aInnnQ1RpaRHh7Hberxk52HVaeJ0xH-t9FA_9KKRTHDic9ytmA7jZDrGbmszvN83-Bqr6Rg8kTq1fsTjYxqm-wu75_cBBNsI9T0M4VUgFne4lRZN-uHBYC7GuzedxIsQsYl8vGE8dRvy11BMNPYRT-sOIJcPLfQCyalND7JOe2eCTA-zkKxmLZvUGr91TbRf3L1rn__FOYuNaDBtOSEFngBsKiBwluBDBggYtrmCffgeTcFlkmUN3HpcL-PDl7JtLKlKN9umf4gCOh5IO11w');

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

function intervalFunc() {
    let date = new Date();
    let hour = date.getHours();
    let minutes = date.getMinutes();
    if (hour < 10) {
        hour = '0' + hour;        
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    let time = hour + ':' + minutes + ':00';

    if ( date.getSeconds() === 0 ) {
        console.log(time);
        getSchedulesAndPostsByUserAndDayAndTime();
    }
    getSchedulesAndPostsByUserAndDayAndTime();
}
setInterval(intervalFunc, 1000);

module.exports = {
    getPostsInCola,
    getPostsByUserInCola,
    getSchedules,
    getSchedulesByDay,
    getSchedulesAndPostsByUserAndDayAndTime
}
