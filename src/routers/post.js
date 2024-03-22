//Import
const router = require('express').Router();
const { pool } = require('../config/postgres');
const checkLogin = require('../middlewares/checkLogin');

//Apis

//게시글 쓰기
//이 api는 프론트와 상의 후 수정하기로..
router.post('/', checkLogin, async (req, res, next) => {
    const { title, content } = req.body;
    const gameIdx = req.query.gameidx;
    const userIdx = req.decoded.userIdx;
    try {
        await pool.query(
            `
            INSERT INTO
                post(
                    user_idx,
                    game_idx,
                    title,
                    content
                )
            VALUES
                ($1, $2, $3, $4)`,
            [userIdx, gameIdx, title, content]
        );
        res.status(201).send();
    } catch (err) {
        next(err);
    }
});

//게시판 보기 (게시글 목록보기)
//무한스크롤
//deleted_at 값이 null이 아닌 경우에는 탈퇴한 사용자임을 구분하도록
router.get('/', async (req, res, next) => {
    const gameIdx = req.query.gameidx;
    try {
        const data = await pool.query(
            `
            SELECT 
                post.idx,
                post.title, 
                post.created_at, 
                post.user_idx,
                "user".nickname,
                "user".deleted_at,
                -- 조회수
                (
                    SELECT
                        COUNT(*)::int
                    FROM
                        view
                    WHERE
                        post_idx = post.idx
                ) AS view
            FROM 
                post
            LEFT JOIN
                view ON post.idx = view.post_idx
            JOIN
                "user" ON post.user_idx = "user".idx
            WHERE
                post.game_idx = $1
            AND 
                post.deleted_at IS NULL
            ORDER BY
                post.idx DESC`,
            gameIdx
        );
        const result = data.rows;
        console.log(result);
        res.status(200).send({
            data: result,
        });
    } catch (err) {
        next(err);
    }
});

//게시글 검색하기
//페이지네이션
router.get('/search', async (req, res, next) => {
    const search = req.query.search;
    try {
        const data = await pool.query(
            `
            SELECT 
                post.title, 
                post.created_at, 
                "user".nickname,
                -- 조회수
                (
                    SELECT
                        COUNT(*)::int
                    FROM
                        view
                    WHERE
                        post_idx = post.idx 
                ) AS view
            FROM 
                post 
            LEFT JOIN
                view ON post.idx = view.post_idx
            JOIN 
                "user" ON post.user_idx = "user".idx
            WHERE
                post.title LIKE '%${search}%'
            AND 
                post.deleted_at IS NULL
            GROUP BY
                    post.idx, "user".nickname
            ORDER BY
                post.idx DESC`
        );
        res.status(200).send({
            data: data.rows,
        });
    } catch (err) {
        return next(err);
    }
});

//게시글 상세보기
router.get('/:postidx', checkLogin, async (req, res, next) => {
    const postIdx = req.params.postidx;
    try {
        const data = await pool.query(
            `
            SELECT 
                post.idx,
                post.user_idx,
                post.*,
                "user".nickname,
                -- 조회수 불러오기
                (
                    SELECT
                        COUNT(*)::int
                    FROM
                        view
                    WHERE
                        post_idx = post.idx 
                ) AS view
            FROM 
                post
            JOIN
                "user" ON post.user_idx = "user".idx
            WHERE
                post.idx = $1
            AND 
                post.deleted_at IS NULL`,
            postIdx
        );
        const result = data.rows;
        res.status(200).send({
            data: result,
        });
    } catch (err) {
        next(err);
    }
});

//게시글 삭제하기
router.delete('/:postidx', checkLogin, async (req, res, next) => {
    const postIdx = req.params.postidx;
    const userIdx = req.decoded.userIdx;
    try {
        await pool.query(
            `
            UPDATE post
            SET
                deleted_at = now()
            WHERE
                idx = $1
            AND 
                user_idx = $2`,
            [postIdx, userIdx]
        );
        res.status(200).send();
    } catch (err) {
        next(err);
    }
});

module.exports = router;
