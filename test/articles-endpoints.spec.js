const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeArticlesArray } = require('./articles.fixtures')
const supertest = require('supertest')

let db

const testArticles = makeArticlesArray()

before('Make knex instance', () => {
    db = knex({
        client: 'pg',
        connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
})

after('disconnect from db', () => db.destroy())

before('clean the table', () => db('blogful_articles').truncate())

afterEach('cleanup', () => db('blogful_articles').truncate())

describe('/articles', function() {
    context('Given there are articles in the database', () => { 
        beforeEach('insert articles', () => {
            return db
                .into('blogful_articles')
                .insert(testArticles)
        })
        it('GET /articles responds with 200 and all of the articles', () => {
            return supertest(app)
                .get('/articles')
                .expect(200, testArticles)
        })        
    })
    context('No articles in database', () => {
        it(`responds with 200 and an empty list`, () => {
            return supertest(app)
                .get('/articles')
                .expect(200, [])
        })
    })
})

describe('/articles/:article_id', function() {
    context('With articles', () => {
        beforeEach('insert articles', () => {
            return db
                .into('blogful_articles')
                .insert(testArticles)
        })
        it('GET /articles/:article_id responds with 200 and the specified article', () => {
            const articleId = 2
            const expectedArticle = testArticles[articleId -1]
            return supertest(app)
                .get(`/articles/${articleId}`)
                .expect(200, expectedArticle)
        })
    })
    context('No articles in database', () => {
        it(`responds with 404`, () => {
            const articleId = 123456
            return supertest(app)
                .get(`/articles/${articleId}`)
                .expect(404, {error: {message: `Article doesn't exist`}})
        })
    })
})