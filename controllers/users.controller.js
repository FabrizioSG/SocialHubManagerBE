const bcrypt = require("bcryptjs");
const token = require('basic-auth-token');
const { ReasonPhrases, StatusCodes } = require("http-status-codes");
const {TwitterApi} = require('twitter-api-v2');
const speakeasy = require("speakeasy");

const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'socialhubmanager.cf0l220amgtd.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'secret2022',
    port: 5432,
})

const T = new TwitterApi({
    appKey:"W0SfhdIFlIEjBAiEuVlNOShIG",
    appSecret:"7mxEw05rtuTQ1GVEqhChsf400mX5WwJm6QYrxXrEyv9Uy4xV4K",
    accessToken:"1589277394107514880-SvQJ9k47tDXGWoYn1fk29l5nDrDz98",
    accessSecret:"z4AIuz8C63BLHUqwvBwvh3u1Lr5JnPjommUzSsjH8opLf",
  });

const getUsers = (request, response) => {
    pool.query('SELECT * FROM usuarios ORDER BY id ASC', (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).json(results.rows)
    })
}

const getUser = (request, response) => {
    const id = parseInt(request.params.id);

    pool.query('SELECT * FROM usuarios WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(StatusCodes.OK).json({
            message: ReasonPhrases.OK,
            data: results.rows[0]
        });
    })
}

const crearTweet = (request, response) => {
    let {texto,usuario,fecha_publicacion,tipo} = request.body;
    T.v2.tweet(texto).then((val) => {
        insertarTweetBD(usuario,fecha_publicacion,tipo);
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
const login = async (request, response) => {

    let { email, password } = request.body;

    // Validar inputs
    if (!(email && password)) {
        return response.status(StatusCodes.BAD_REQUEST).json({
            message: ReasonPhrases.BAD_REQUEST,
            data: "Falta correo o contraseña"
        });
    }

    //Validar existencia de usuario
    pool.query('SELECT * FROM usuarios WHERE email = $1', [email], async (error, results) => {
        if (error) {
            throw error
        }
        if (results.rows.length<1) {
            return response.status(StatusCodes.NOT_FOUND).json({
                message: ReasonPhrases.NOT_FOUND,
                data: "Usuario no existe en la base de datos"
            });
        }
        // Comparar contraseña
        if (await bcrypt.compare(password, results.rows[0].password)) {
            auth = token(results.rows[0].id,results.rows[0].password);
            user = {"data":results.rows[0], "token":auth};
            return response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: (user)
            });
        } else {
            return response.status(StatusCodes.UNAUTHORIZED).json({
                message: ReasonPhrases.UNAUTHORIZED,
                data: "Usuario o contraseña incorrecto"
            });
        }
    })
}

const createUser = async (request, response) => {
    let { firstName, lastName, email, password } = request.body

    password = await bcrypt.hash(password, 10);

    pool.query('INSERT INTO usuarios (nombre,apellido, email,password) VALUES ($1, $2, $3,$4)', [firstName, lastName, email, password], (error, results) => {
        if (error) {
            throw error
        }
        response.status(StatusCodes.CREATED).json({
            message: ReasonPhrases.CREATED,
            data: "User created:" + email,
        });
    })
}

const updateUser = (request, response) => {
    const id = parseInt(request.params.id)
    const { nombre, apellido, email } = request.body
    console.log(nombre);
    console.log(apellido);
    console.log(email);

    pool.query(
        'UPDATE usuarios SET nombre = $1, apellido = $2, email = $3 WHERE id = $4',
        [nombre, apellido, email, id],
        (error, results) => {
            if (error) {
                throw error
            }
            response.status(StatusCodes.OK).json({
                message: ReasonPhrases.OK,
                data: "User updated:" + email,
            });
        }
    )
}

const deleteUser = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('DELETE FROM usuarios WHERE id = $1', [id], (error, results) => {
        if (error) {
            throw error
        }
        response.status(200).send(`User deleted with ID: ${id}`)
    })
}

const insertarTweetBD = async (usuario, fecha_publicacion, tipo) => {
    if(!fecha_publicacion) {
        fecha_publicacion = Date.now()/1000;
    }
    pool.query('INSERT INTO posts (usuario_id,plataforma,fecha_publicacion,tipo) VALUES ($1, $2, to_timestamp($3), $4)', [usuario,'Twitter',fecha_publicacion,tipo], (error, results) => {
        if (error) {
            throw error
        }
        return results;
    })
}

const generarOTP = async (request, response) => {
    const id = parseInt(request.params.id);
    const { ascii, hex, base32, otpauth_url } = speakeasy.generateSecret({
        issuer: "SocialHubManager",
        name: "SocialHubManager",
        length: 15
    });

    pool.query(
        'UPDATE usuarios SET otp_ascii = $1, otp_hex = $2, otp_base32 = $3, otp_auth_url = $4 WHERE id = $5',
        [ascii, hex, base32, otpauth_url, id],
        (error, results) => {
            if (error) {
                throw error
            }
            response
                .status(StatusCodes.OK)
                .json({
                    message: ReasonPhrases.OK,
                    base32, 
                    otpauth_url
                });
        }
    )
}

const verificarOTP = async (request, response) => {
    const id = parseInt(request.params.id);
    const { token } = request.body;

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);

    if (!rows[0]) {
        return response.status(StatusCodes.UNAUTHORIZED).json({
            message: ReasonPhrases.UNAUTHORIZED,
            data: "Token o usuario no existe"
        });
    }

    const verificado = speakeasy.totp.verify({
        secret: rows[0].otp_base32,
        encoding: "base32",
        token
    });

    if (!verificado) {
        return response.status(StatusCodes.UNAUTHORIZED).json({
            message: ReasonPhrases.UNAUTHORIZED,
            data: "Token o usuario no existe"
        });
    }

    pool.query(
        'UPDATE usuarios SET otp_habilitado = true, otp_verificado = true WHERE id = $1',
        [id],
        (error, results) => {
            if (error) {
                throw error
            }
            response
                .status(StatusCodes.OK)
                .json({
                    message: ReasonPhrases.OK,
                    data: `OTP verified for user with ID: ${id}`
                });
        }
    )
}

const validarOTP = async (request, response) => {
    const id = parseInt(request.params.id);
    const { token } = request.body;

    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);

    if (!rows[0]) {
        return response.status(StatusCodes.UNAUTHORIZED).json({
            message: ReasonPhrases.UNAUTHORIZED,
            data: "Token o usuario no existe"
        });
    }

    const tokenValidado = speakeasy.totp.verify({
        secret: rows[0].otp_base32,
        encoding: "base32",
        token,
        window: 1
    });

    if (!tokenValidado) {
        return response.status(StatusCodes.UNAUTHORIZED).json({
            message: ReasonPhrases.UNAUTHORIZED,
            data: "Token invalido o usuario no existe"
        });
    }

    response
        .status(StatusCodes.OK)
        .json({
            message: ReasonPhrases.OK,
            data: `OTP validated for user with ID: ${id}`
        });
}

const desactivarOTP = async (request, response) => {
    const id = parseInt(request.params.id);

    pool.query(
        'UPDATE usuarios SET otp_habilitado = false WHERE id = $1',
        [id],
        (error, results) => {
            if (error) {
                throw error
            }
            response
                .status(StatusCodes.OK)
                .json({
                    message: ReasonPhrases.OK,
                    data: `OTP disabled for user with ID: ${id}`
                });
        }
    )
}

module.exports = {
    crearTweet,
    getUsers,
    getUser,
    login,
    createUser,
    updateUser,
    deleteUser,
    generarOTP,
    verificarOTP,
    validarOTP,
    desactivarOTP
}