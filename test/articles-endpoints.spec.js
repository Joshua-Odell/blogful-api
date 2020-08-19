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

describe('/api/articles', function() {
    context('Given there are articles in the database', () => { 
        beforeEach('insert articles', () => {
            return db
                .into('blogful_articles')
                .insert(testArticles)
        })
        it('GET api/articles responds with 200 and all of the articles', () => {
            return supertest(app)
                .get('api/articles')
                .expect(200, testArticles)
        })        
    })
    context('No articles in database', () => {
        it(`responds with 200 and an empty list`, () => {
            return supertest(app)
                .get('api/articles')
                .expect(200, [])
        })
    })
})

describe('/api/articles/:article_id', function() {
    context('With articles', () => {
        beforeEach('insert articles', () => {
            return db
                .into('blogful_articles')
                .insert(testArticles)
        })
        it('GET api/articles/:article_id responds with 200 and the specified article', () => {
            const articleId = 2
            const expectedArticle = testArticles[articleId -1]
            return supertest(app)
                .get(`/api/articles/${articleId}`)
                .expect(200, expectedArticle)
        })
    })
    context('No articles in database', () => {
        it(`responds with 404`, () => {
            const articleId = 123456
            return supertest(app)
                .get(`api/articles/${articleId}`)
                .expect(404, {error: {message: `Article doesn't exist`}})
        })
    })
})

describe('api/articles POST', () => {
    it('creates an article, responding with 201 and the new article', function(){
        this.retries(3)
        const newArticle = {
            title: 'Test new article',
            //style: 'Listicle',
            content: 'Test new article content...'
        }
        return supertest(app)
            .post('api/articles')
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
                    .get(`api/articles/${postRes.body.id}`)
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
                .post('api/articles')
                .send(newArticles)
                .expect(400, {
                    error: {message: `Missing '${field}' in request body`}
                })
        })
    })
})

describe.only(`PATCH /api/articles/:article_id`, () => {
    context(`Given no articles`, () => {
        it(`responds with 404`, () => {
            const articleId = 123456
            return supertest(app)
                .patch(`/api/articles/${articleId}`)
                .expect(404, { error: { message: `Article doesn't exist`}})
        })
    })
    context('With Articles', () => {
        const testArticles = makeArticlesArray()

        beforeEach('insert articles', () => {
            return db
                .into('blogful_articles')
                .insert(testArticles)
        })

        it('responds with 204 and updates the artticle', () => {
            const idToUpdate = 2
            const updateArticle = {
                title: 'updated article title',
                style: 'Interview',
                content: 'updated article content',
            }
            const expectedArticle = {
                ...testArticles[idToUpdate - 1],
                ...updateArticle
            }
            return supertest(app)
                .patch(`/api/articles/${idToUpdate}`)
                .send(updateArticle)
                .expect(204)
                .then(res => 
                    supertest(app)
                    .get(`/api/articles${idToUpdate}`)
                    .expect(expectedArticle)
                )
        })

        it(`responds with 400 when no required fields supplied`, () => {
            const idToUpdate = 2
            return supertest(app)
                .patch(`/api/articles/${idToUpdate}`)
                .send({ irrelevantField: 'foo' })
                .expect(400, {
                    error: {
                        message: `Request body must contain either 'title', 'style' or 'content'`
                    }
                })
        })

        it(`responds with 204 when updating only a subset of fields`, () => {
            const idToUpdate = 2
            const updateArticle = {
                title: 'update article title',
            }
            const expectedArticle = {
                ...testArticles[idToUpdate - 1],
                ...updateArticle
            }

            return supertest(app)
                .patch(`/api/articles/${idToUpdate}`)
                .send({
                    ...updateArticle,
                    fieldToIgnore: 'should not be in GET response'
                })
                .expect(204)
                .then(res => 
                    supertest(app)
                    .get(`/api/articles/${idToUpdate}`)
                    .expect(expectedArticle)
                )
        })
    })
})