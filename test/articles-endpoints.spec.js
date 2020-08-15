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
    context(`GIven an XSS attack article`, () => {
        const maliciousArticle = { 
            id: 911,
            title: 'Naught naughty very naughty <script>('xss');</script>',
            style: 'How-to',
            content: `Bade image <img src="https://url.fake/does-not.exist" onerror`
        }
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

describe('/articles POST', () => {
    it('creates an article, responding with 201 and the new article', function(){
        this.retries(3)
        const newArticle = {
            title: 'Test new article',
            //style: 'Listicle',
            content: 'Test new article content...'
        }
        return supertest(app)
            .post('/articles')
            .send(newArticle)
            .expect(201)
            .expect(res => {
                expect (res.body.title).to.eql(newArticle.title)
                //expect(res.body.style).to.eql(newArticle.style)
                expect(res.body.content).to.eql(newArticle.content)
                expect(res.body).to.have.property('id')
                expect(res.headers.location).to.eql(`'articles/${res.body.id}`)
                const expected = new Date().toLocaleString()
                const actual = new Date(res.body.date_published).toLocaleString()
                expect(actual).to.eql(expected)
            })
            .then(postRes => 
                supertest(app)
                    .get(`/articles/${postRes.body.id}`)
                    .expect(postRes.body)    
            )
    })
    const requiredFields = ['title', 'style', 'content']

    requiredFields.forEach(field => {
        const newArticle = {
            title: 'Test new article',
            style: 'Listicle',
            content: 'Test new article content...'
        }

        it(`responds with 400 and an erro message when the '${field}' is missing`, () => {
            delete newArticle[field]

            return supertest(app)
                .post('/articles')
                .send(newArticles)
                .expect(400, {
                    error: {message: `Missing '${field}' in request body`}
                })
        })
    })
})